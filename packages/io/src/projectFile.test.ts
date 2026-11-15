import { it, expect } from "vitest";
import { makeProject, place } from "../../../fixtures/builders";
import { decodeProject, encodeProject, restoreSolution } from "./projectFile";
it("roundtrips and recomputes metrics without trusting client flags", () => {
  const input = makeProject();
  const raw = {
    inputRevisionId: input.revisionId,
    placements: [place(input.instances[0].id, 0, 0, 0)],
    run: { seed: 1, attempts: 1, algorithmVersion: "test" },
    status: "ready",
    metrics: { placedCount: 999 },
  };
  const s = restoreSolution(input, raw)!;
  expect(s.metrics.placedCount).toBe(1);
  expect(decodeProject(encodeProject(input, s)).solution?.placements).toEqual(
    s.placements,
  );
  expect(() =>
    decodeProject(
      new TextEncoder().encode('{"format":"vlezet","schemaVersion":99}'),
    ),
  ).toThrow();
  expect(() =>
    restoreSolution(input, {
      ...raw,
      placements: [place(input.instances[0].id, -1, 0, 0)],
    }),
  ).toThrow();
});
it("recomputes proven failure reasons and preserves empty-search status on roundtrip", async () => {
  const { search } = await import("@vlezet/packing");
  const { makeCargo } = await import("../../../fixtures/builders");
  const options = {
    seed: 42,
    maxAttempts: 0,
    deadlineMs: 5000,
    signal: new AbortController().signal,
  };
  for (const cargo of [
    makeCargo({ massG: 100001 }),
    makeCargo({ lengthMm: 1001, widthMm: 1001, heightMm: 1001 }),
    makeCargo({ quantity: 2, lengthMm: 900, widthMm: 900, heightMm: 900 }),
  ]) {
    const input = makeProject([cargo]);
    const result = await search(input, options, () => {});
    expect(result.status).toBe("proven-infeasible");
    const restored = decodeProject(encodeProject(input, result)).solution!;
    expect(restored.status).toBe("proven-infeasible");
    expect(restored.issues).toEqual(result.issues);
  }
  const input = makeProject();
  const result = await search(input, options, () => {});
  const forged = {
    ...result,
    status: "proven-infeasible",
    issues: [{ message: "untrusted" }],
  };
  expect(restoreSolution(input, forged)?.status).toBe("not-found");
  expect(restoreSolution(input, forged)?.issues).toEqual([]);
  expect(decodeProject(encodeProject(input, result)).solution?.status).toBe(
    "not-found",
  );
});
it("preserves cancellation independently of whether a solution exists", () => {
  const input = makeProject();
  const restored = decodeProject(
    encodeProject(input, null, { cancelled: true }),
  );
  expect(restored.cancelled).toBe(true);
  expect(restored.solution).toBeNull();
});
