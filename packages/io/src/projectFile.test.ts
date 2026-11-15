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
