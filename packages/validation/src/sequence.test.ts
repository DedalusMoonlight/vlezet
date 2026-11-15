import { expect, it } from "vitest";
import { makeCargo, makeProject, place } from "../../../fixtures/builders";
import { validatePlan } from "./validate";
import { planSequence } from "./sequence";
it("rejects cyclic support dependencies", () => {
  const p = makeProject([makeCargo({ quantity: 2 })]);
  const rect = { x0: 0, y0: 0, x1: 100, y1: 100 };
  const r = planSequence(p, [place("a-001"), place("a-002", 100)], {
    issues: [],
    contacts: [
      { upperId: "a-001", lowerId: "a-002", rect, areaMm2: 10000 },
      { upperId: "a-002", lowerId: "a-001", rect, areaMm2: 10000 },
    ],
  });
  expect(r.issues.some((i) => i.code === "sequence-cycle")).toBe(true);
});
it("rejects later delivery blocking an earlier box", () => {
  const p = makeProject([
    makeCargo({ id: "early", stop: 1 }),
    makeCargo({ id: "late", stop: 2 }),
  ]);
  const r = validatePlan(p, [place("late-001"), place("early-001", 100)]);
  expect(r.valid).toBe(false);
  expect(r.issues.some((i) => i.code === "stop-order")).toBe(true);
});
it("removes the top box before both supports and reverses into loading", () => {
  const p = makeProject([
    makeCargo({ id: "lower", quantity: 2, stop: 2 }),
    makeCargo({ id: "top", widthMm: 200, stop: 1 }),
  ]);
  const ps = [
    place("lower-001"),
    place("lower-002", 0, 100),
    place("top-001", 0, 0, 100),
  ];
  const r = validatePlan(p, ps);
  expect(r.valid).toBe(true);
  expect(r.unloadSteps.map((s) => s.instanceId)).toEqual([
    "top-001",
    "lower-001",
    "lower-002",
  ]);
  expect(r.loadSteps.map((s) => s.instanceId)).toEqual([
    "lower-002",
    "lower-001",
    "top-001",
  ]);
  p.cargoTypes[1].stop = 3;
  expect(
    validatePlan(p, ps).issues.filter((i) => i.code === "stop-order"),
  ).toHaveLength(2);
});
it("produces deterministic straight paths and rejects dependency cycles", () => {
  const p = makeProject([makeCargo({ quantity: 2 })]);
  const r = validatePlan(p, [place("a-002", 100), place("a-001")]);
  expect(r.unloadSteps[0]).toMatchObject({
    instanceId: "a-001",
    to: { x: -110, y: 0, z: 0 },
  });
  expect(r.loadSteps[1]).toMatchObject({
    instanceId: "a-001",
    from: { x: -110, y: 0, z: 0 },
  });
});
