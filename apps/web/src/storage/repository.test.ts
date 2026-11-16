import "fake-indexeddb/auto";
import { it, expect } from "vitest";
import { makeProject, place } from "../../../../fixtures/builders";
import { restoreSolution } from "@vlezet/io";
import { freshPlayback } from "../features/instructions/playback";
import { saveProject, loadProject } from "./repository";
it("stores input and plan atomically and only restores matching playback", async () => {
  const input = makeProject();
  const s = restoreSolution(input, {
    inputRevisionId: input.revisionId,
    placements: [place(input.instances[0].id, 0, 0, 0)],
    run: { seed: 1, attempts: 1, algorithmVersion: "test" },
  })!;
  const playback = { ...freshPlayback(s), stepIndex: 1 };
  await saveProject(input, s, playback);
  const a = await loadProject("active");
  expect(a?.solution?.placements).toEqual(s.placements);
  expect(a?.playback?.stepIndex).toBe(1);
  await saveProject({ ...input, revisionId: "edited" }, s, playback);
  const b = await loadProject("active");
  expect(b?.stale).toBe(true);
  expect(b?.solution).toBeNull();
  expect(b?.playback).toBeNull();
});
it("does not report success when IndexedDB rejects a write", async () => {
  const { db } = await import("./db");
  const { vi } = await import("vitest");
  const spy = vi
    .spyOn(db.projects, "put")
    .mockRejectedValueOnce(new DOMException("Quota", "QuotaExceededError"));
  await expect(saveProject(makeProject(), null, null)).rejects.toThrow("Quota");
  spy.mockRestore();
});
it("migrates the original envelope but refuses future versions", async () => {
  const { migrateStored } = await import("./repository");
  expect(
    migrateStored({
      id: "active",
      version: 0,
      project: { input: makeProject(), solution: null },
    }).version,
  ).toBe(1);
  expect(() => migrateStored({ id: "active", version: 99 })).toThrow();
});
it("restores a cancelled calculation even before its first result", async () => {
  await saveProject(makeProject(), null, null, true);
  expect((await loadProject("active"))?.cancelled).toBe(true);
});
it("keeps the previous project independent and retains vehicle identity", async () => {
  const previous = makeProject();
  previous.vehicle.presetId = "largus-van";
  await saveProject(previous, null, null, false, "previous");
  const active = makeProject([], { revisionId: "empty" });
  await saveProject(active, null, null);
  expect((await loadProject("previous"))?.input).toEqual(previous);
  expect((await loadProject("active"))?.input).toEqual(active);
});
it("rolls back both project slots when writing the new active project fails", async () => {
  const { vi } = await import("vitest");
  const { saveProjectSwap } = await import("./repository");
  const current = makeProject([], { revisionId: "current" });
  const previous = makeProject(undefined, { revisionId: "previous" });
  await saveProject(current, null, null);
  await saveProject(previous, null, null, false, "previous");
  const put = IDBObjectStore.prototype.put;
  const spy = vi
    .spyOn(IDBObjectStore.prototype, "put")
    .mockImplementation(function (this: IDBObjectStore, value, key) {
      if (value.id === "active")
        throw new DOMException("Quota", "QuotaExceededError");
      return put.call(this, value, key);
    });
  try {
    await expect(
      saveProjectSwap(
        { input: previous, solution: null, playback: null, cancelled: false },
        { input: current, solution: null, playback: null, cancelled: false },
      ),
    ).rejects.toThrow();
  } finally {
    spy.mockRestore();
  }
  expect((await loadProject("active"))?.input.revisionId).toBe("current");
  expect((await loadProject("previous"))?.input.revisionId).toBe("previous");
});
