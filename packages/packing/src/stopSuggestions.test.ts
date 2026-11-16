import { expect, it } from "vitest";
import { makeCargo, makeProject } from "../../../fixtures/builders";
import { search } from "./search";
import { suggestStopOrder, reorderStops } from "./stopSuggestions";
import { validatePlan } from "@vlezet/validation";
const options = () => ({
  seed: 42,
  maxAttempts: 12,
  deadlineMs: 1500,
  signal: new AbortController().signal,
});
export const conflict = () =>
  makeProject(
    [
      makeCargo({
        id: "base",
        quantity: 2,
        stop: 10,
        allowedDownFaces: ["-Z"],
      }),
      makeCargo({
        id: "fragile",
        lengthMm: 200,
        stop: 20,
        maxTopLoadG: 0,
        allowedDownFaces: ["-Z"],
      }),
    ],
    {
      vehicle: { lengthMm: 200, widthMm: 100, heightMm: 200, payloadG: 10000 },
    },
  );
it("finds a validated full load by unloading the fragile top before its supports", async () => {
  const input = conflict(),
    original = structuredClone(input);
  const baseline = await search(input, options(), () => {});
  expect(baseline.placements.length).toBeLessThan(3);
  const suggestion = await suggestStopOrder(input, baseline, options());
  expect(suggestion?.stopOrder).toEqual([20, 10]);
  expect(input).toEqual(original);
  const reordered = reorderStops(input, suggestion!.stopOrder);
  expect(reordered.instances).toEqual(input.instances);
  expect(reordered.cargoTypes.map((c) => c.stop)).toEqual([20, 10]);
  expect(suggestion!.solution.placements).toHaveLength(3);
  expect(validatePlan(reordered, suggestion!.solution.placements).valid).toBe(
    true,
  );
  expect(validatePlan(input, suggestion!.solution.placements).valid).toBe(
    false,
  );
});
it("does not suggest an alternative for an already complete load or cancellation", async () => {
  const input = conflict();
  const complete = await search(
    reorderStops(input, [20, 10]),
    options(),
    () => {},
  );
  expect(await suggestStopOrder(input, complete, options())).toBeNull();
  const baseline = await search(input, options(), () => {});
  const controller = new AbortController();
  controller.abort();
  expect(
    await suggestStopOrder(input, baseline, {
      ...options(),
      signal: controller.signal,
    }),
  ).toBeNull();
});
it("does not turn an optional omission or excess mass into a promise that everything fits", async () => {
  const input = conflict();
  input.vehicle.payloadG = 1000;
  input.cargoTypes.forEach((c) => (c.required = false));
  const baseline = await search(input, options(), () => {});
  expect(baseline.placements.length).toBeLessThan(3);
  expect(await suggestStopOrder(input, baseline, options())).toBeNull();
});
it("rejects incomplete or duplicate stop permutations", () => {
  const input = conflict();
  expect(() => reorderStops(input, [10])).toThrow();
  expect(() => reorderStops(input, [10, 10])).toThrow();
});
