import { it, expect } from "vitest";
import {
  makeCargo,
  makeProject,
  place,
} from "../../../../../fixtures/builders";
import { restoreSolution } from "@vlezet/io";
import { previewEdit } from "./commands";
it("blocks moving either support under a box and validates edits", () => {
  const input = makeProject([
    makeCargo({ id: "base", lengthMm: 50, quantity: 2 }),
    makeCargo({ id: "top" }),
  ]);
  const [a, b, t] = input.instances;
  const placements = [
    place(a.id, 0, 0, 0),
    place(b.id, 50, 0, 0),
    place(t.id, 0, 0, 100),
  ];
  const s = restoreSolution(input, {
    inputRevisionId: input.revisionId,
    placements,
    run: { seed: 1, attempts: 1, algorithmVersion: "test" },
  })!;
  for (const id of [a.id, b.id])
    expect(
      previewEdit(input, s, {
        kind: "move",
        instanceId: id,
        position: { x: 200, y: 0, z: 0 },
      }).accepted,
    ).toBe(false);
  expect(
    previewEdit(input, s, {
      kind: "move",
      instanceId: t.id,
      position: { x: 200, y: 0, z: 0 },
    }).accepted,
  ).toBe(true);
  expect(
    previewEdit(input, s, {
      kind: "move",
      instanceId: t.id,
      position: { x: -1, y: 0, z: 0 },
    }).accepted,
  ).toBe(false);
});
it("undo and redo restore exact ids, positions and labelled orientations", async () => {
  const { historyPush, historyUndo, historyRedo } = await import("./commands");
  const input = makeProject();
  const a = restoreSolution(input, {
    inputRevisionId: input.revisionId,
    placements: [place(input.instances[0].id, 0, 0, 0)],
    run: { seed: 1, attempts: 1, algorithmVersion: "test" },
  })!;
  const b = restoreSolution(input, {
    ...a,
    placements: [
      {
        ...a.placements[0],
        position: { x: 200, y: 0, z: 0 },
        orientation: { downFace: "+Z", yawQuarterTurns: 3 },
      },
    ],
  })!;
  const h = historyPush({ past: [], present: a, future: [] }, b);
  expect(historyUndo(h).present).toEqual(a);
  expect(historyRedo(historyUndo(h)).present).toEqual(b);
});
