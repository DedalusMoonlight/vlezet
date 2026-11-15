import { it, expect } from "vitest";
import {
  makeProject,
  makeCargo,
  place,
} from "../../../../../fixtures/builders";
import { restoreSolution } from "@vlezet/io";
import { freshPlayback, getStepScene } from "./playback";
it("replays the checked sequence and blocks partial instructions", () => {
  const p = makeProject([makeCargo({ quantity: 2 })]);
  const s = restoreSolution(p, {
    inputRevisionId: p.revisionId,
    placements: [
      place(p.instances[0].id, 0, 0, 0),
      place(p.instances[1].id, 200, 0, 0),
    ],
    run: { seed: 1, attempts: 1, algorithmVersion: "test" },
  })!;
  const state = freshPlayback(s, "load");
  expect(getStepScene(s, state, 0).staticIds).toEqual([]);
  expect(getStepScene(s, state, 0).position).toEqual(
    s.report!.loadSteps[0].from,
  );
  expect(getStepScene(s, state, 1).position).toEqual(s.report!.loadSteps[0].to);
  expect(
    getStepScene(s, { ...state, stepIndex: 2 }, 1).staticIds.sort(),
  ).toEqual(p.instances.map((i) => i.id).sort());
  const u = freshPlayback(s, "unload");
  expect(getStepScene(s, { ...u, stepIndex: 2 }, 1).staticIds).toEqual([]);
  expect(() => getStepScene({ ...s, status: "partial" }, state, 0)).toThrow();
  expect(() =>
    getStepScene(s, { ...state, solutionRevisionId: "old" }, 0),
  ).toThrow();
});
