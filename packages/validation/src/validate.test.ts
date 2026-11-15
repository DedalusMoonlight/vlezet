import { expect, it } from "vitest";
import { makeCargo, makeProject, place } from "../../../fixtures/builders";
import { validatePlan } from "./validate";
it("reports missing required boxes but allows diagnostic partial layouts", () => {
  const p = makeProject([makeCargo({ quantity: 2 })]);
  expect(validatePlan(p, [place("a-001")]).valid).toBe(false);
  expect(
    validatePlan(p, [place("a-001")], { requireAllRequired: false }).valid,
  ).toBe(true);
});
it("rejects duplicate IDs, unknown IDs, overloaded vehicle and hostile input", () => {
  const p = makeProject();
  expect(validatePlan(p, [place("a-001"), place("a-001")]).valid).toBe(false);
  expect(validatePlan(p, [place("unknown")]).valid).toBe(false);
  p.vehicle.payloadG = 999;
  expect(
    validatePlan(p, [place("a-001")]).issues.some((i) => i.code === "payload"),
  ).toBe(true);
  expect(
    validatePlan(p, [{ instanceId: "a-001", valid: true } as never]).valid,
  ).toBe(false);
});
it("recomputes support and load rather than trusting claimed validity", () => {
  const p = makeProject();
  expect(
    validatePlan(p, [
      { ...place("a-001", 0, 0, 500), valid: true } as never,
    ]).issues.some((i) => i.code === "support-area"),
  ).toBe(true);
});
