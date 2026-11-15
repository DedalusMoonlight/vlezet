import { expect, it } from "vitest";
import { makeCargo, makeProject, place } from "../../../fixtures/builders";
import { buildSupports } from "./supports";
const supportCase = (gap = 5) => {
  const p = makeProject(
    [
      makeCargo({ id: "left", lengthMm: 47 }),
      makeCargo({ id: "right", lengthMm: 48 }),
      makeCargo({ id: "top" }),
    ],
    {
      settings: {
        wallGapMm: 0,
        horizontalGapMm: gap,
        supportModel: "support-v1",
      },
    },
  );
  return {
    p,
    placements: [
      place("left-001"),
      place("right-001", 52),
      place("top-001", 0, 0, 100),
    ],
  };
};
it("allows 95 percent contact and a five millimetre seam", () => {
  const { p, placements } = supportCase();
  expect(buildSupports(p, placements).issues).toEqual([]);
  expect(
    buildSupports(p, placements).contacts.filter(
      (c) => c.upperId === "top-001",
    ),
  ).toHaveLength(2);
});
it("rejects wider gaps even with enough total area", () => {
  const { p, placements } = supportCase();
  p.cargoTypes[0].lengthMm = 470;
  p.cargoTypes[1].lengthMm = 524;
  p.cargoTypes[2].lengthMm = 1000;
  placements[1].position.x = 476;
  expect(
    buildSupports(p, placements).issues.some((i) => i.code === "support-gap"),
  ).toBe(true);
});
it("requires full coverage with zero gap and exact equal support heights", () => {
  const { p, placements } = supportCase(0);
  expect(buildSupports(p, placements).issues.length).toBeGreaterThan(0);
  p.settings.horizontalGapMm = 5;
  p.cargoTypes[1].heightMm = 99;
  expect(buildSupports(p, placements).issues.length).toBeGreaterThan(0);
});
it("rejects unsupported corners and floating boxes", () => {
  const { p, placements } = supportCase();
  placements[2].position.x = 1;
  expect(
    buildSupports(p, placements).issues.some(
      (i) => i.code === "support-corners",
    ),
  ).toBe(true);
  placements[2].position.z = 101;
  expect(buildSupports(p, placements).issues.length).toBeGreaterThan(0);
});
