import { expect, it } from "vitest";
import { makeCargo, makeProject, place } from "../../../fixtures/builders";
import { enumerateOrientations, orientedBox } from "./orientation";
import {
  overlapVolume,
  rectUnionArea,
  coversRect,
  geometryIssues,
} from "./geometry";
it("preserves face identity for all 24 orientations including cubes", () => {
  expect(enumerateOrientations(makeCargo())).toHaveLength(24);
  const only = enumerateOrientations(makeCargo({ allowedDownFaces: ["+X"] }));
  expect(only).toHaveLength(4);
  expect(only.every((o) => o.downFace === "+X")).toBe(true);
  const b = orientedBox(
    makeCargo({ lengthMm: 100, widthMm: 200, heightMm: 300 }),
    { ...place("a"), orientation: only[0] },
  );
  expect(b.max.z).toBe(100);
});
it("distinguishes contact from penetration", () => {
  const a = { min: { x: 0, y: 0, z: 0 }, max: { x: 100, y: 100, z: 100 } };
  expect(
    overlapVolume(a, {
      min: { x: 100, y: 0, z: 0 },
      max: { x: 200, y: 100, z: 100 },
    }),
  ).toBe(0);
  expect(
    overlapVolume(a, {
      min: { x: 99, y: 0, z: 0 },
      max: { x: 199, y: 100, z: 100 },
    }),
  ).toBe(10000);
});
it("computes actual rectangle union without double counting", () => {
  const r = [
    { x0: 0, y0: 0, x1: 60, y1: 100 },
    { x0: 40, y0: 0, x1: 100, y1: 100 },
  ];
  expect(rectUnionArea(r)).toBe(10000);
  expect(coversRect({ x0: 0, y0: 0, x1: 100, y1: 100 }, r)).toBe(true);
  expect(coversRect({ x0: 0, y0: 0, x1: 101, y1: 100 }, r)).toBe(false);
});
it("enforces configurable gaps without separating stacked contacts", () => {
  const p = makeProject([makeCargo({ quantity: 2 })], {
    settings: { wallGapMm: 10, horizontalGapMm: 5, supportModel: "support-v1" },
  });
  expect(
    geometryIssues(p, [place("a-001", 10, 10, 0), place("a-002", 110, 10, 0)])
      .length,
  ).toBeGreaterThan(0);
  expect(
    geometryIssues(p, [place("a-001", 10, 10, 0), place("a-002", 115, 10, 0)]),
  ).toEqual([]);
  expect(
    geometryIssues(p, [place("a-001", 10, 10, 0), place("a-002", 10, 10, 100)]),
  ).toEqual([]);
  expect(geometryIssues(p, [place("a-001", 0, 10, 0)]).length).toBeGreaterThan(
    0,
  );
});
