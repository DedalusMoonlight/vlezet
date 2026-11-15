import { it, expect } from "vitest";
import { makeCargo, makeProject } from "../../../../../fixtures/builders";
import { replaceCargo, splitRequired } from "./editing";
it("preserves instance ids, and splits optional units atomically", () => {
  const c = makeCargo({ quantity: 3 });
  const p = makeProject([c]);
  const q = splitRequired(p, c.id, 1);
  expect(q.cargoTypes.map((t) => [t.quantity, t.required])).toEqual([
    [2, true],
    [1, false],
  ]);
  expect(q.instances.length).toBe(3);
  expect(q.instances[0].id).toBe(p.instances[0].id);
  expect(() => replaceCargo(p, [{ ...c, quantity: 301 }])).toThrow();
});
