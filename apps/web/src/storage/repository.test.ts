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
