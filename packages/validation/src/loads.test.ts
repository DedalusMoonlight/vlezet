import { expect, it } from "vitest";
import fc from "fast-check";
import { makeCargo, makeProject, place } from "../../../fixtures/builders";
import { buildSupports } from "./supports";
import { calculateLoads } from "./loads";
function stack(topMass = 20000, split = 100) {
  const p = makeProject([
    makeCargo({ id: "base", lengthMm: 200 }),
    makeCargo({ id: "left", lengthMm: split }),
    makeCargo({ id: "right", lengthMm: 200 - split }),
    makeCargo({ id: "top", lengthMm: 200, massG: topMass }),
  ]);
  const placements = [
    place("base-001"),
    place("left-001", 0, 0, 100),
    place("right-001", split, 0, 100),
    place("top-001", 0, 0, 200),
  ];
  return { p, placements };
}
it("splits and rejoins weight without counting it twice", () => {
  const { p, placements } = stack();
  const r = calculateLoads(p, buildSupports(p, placements));
  expect(r.topLoadG["left-001"]).toBe(10000);
  expect(r.topLoadG["right-001"]).toBe(10000);
  expect(r.topLoadG["base-001"]).toBe(22000);
  expect(r.floorLoadG).toBe(23000);
});
it("weights contacts by area and enforces zero and cumulative limits", () => {
  const { p, placements } = stack(20000, 50);
  let r = calculateLoads(p, buildSupports(p, placements));
  expect(r.topLoadG["left-001"]).toBe(5000);
  expect(r.topLoadG["right-001"]).toBe(15000);
  p.cargoTypes[1].maxTopLoadG = 0;
  p.cargoTypes[0].maxTopLoadG = 21000;
  r = calculateLoads(p, buildSupports(p, placements));
  expect(r.issues.filter((i) => i.code === "top-load")).toHaveLength(2);
});
it("conserves mass for random branched stacks", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 1, max: 50000 }),
      fc.integer({ min: 1, max: 199 }),
      (mass, split) => {
        const { p, placements } = stack(mass, split);
        const r = calculateLoads(p, buildSupports(p, placements));
        expect(r.floorLoadG).toBeCloseTo(mass + 3000, 6);
      },
    ),
  );
});
