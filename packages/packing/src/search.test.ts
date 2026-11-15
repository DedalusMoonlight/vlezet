import { expect, it } from "vitest";
import { makeCargo, makeProject } from "../../../fixtures/builders";
import { search } from "./search";
import fc from "fast-check";
it("uses optional boxes as multiple supports under a required fragile box", async () => {
  const p = makeProject(
    [
      makeCargo({
        id: "base",
        quantity: 2,
        required: false,
        allowedDownFaces: ["-Z"],
      }),
      makeCargo({
        id: "top",
        lengthMm: 200,
        maxTopLoadG: 0,
        allowedDownFaces: ["-Z"],
      }),
    ],
    {
      vehicle: { lengthMm: 200, widthMm: 100, heightMm: 200, payloadG: 10000 },
    },
  );
  const r = await search(p, opts(), () => {});
  expect(r.status).toBe("ready");
  expect(r.placements).toHaveLength(3);
  expect(
    r.report?.supports.contacts.filter((c) => c.upperId === "top-001"),
  ).toHaveLength(2);
});
it("only publishes valid placements on generated small inputs", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.integer({ min: 1, max: 8 }),
      fc.integer({ min: 20, max: 100 }),
      async (quantity, size) => {
        const p = makeProject([
          makeCargo({
            quantity,
            lengthMm: size,
            widthMm: size,
            heightMm: size,
          }),
        ]);
        const r = await search(p, opts(), () => {});
        expect(r.status).toBe("ready");
        expect(r.report?.valid).toBe(true);
      },
    ),
    { numRuns: 10 },
  );
});
const opts = () => ({
  seed: 42,
  maxAttempts: 12,
  deadlineMs: 10000,
  signal: new AbortController().signal,
});
it("fits required cargo and independently validates its instructions", async () => {
  const p = makeProject([makeCargo({ quantity: 8 })]);
  const r = await search(p, opts(), () => {});
  expect(r.status).toBe("ready");
  expect(r.placements).toHaveLength(8);
  expect(r.report?.valid).toBe(true);
  expect(r.report?.unloadSteps).toHaveLength(8);
});
it("does not sacrifice mandatory boxes for optional volume", async () => {
  const p = makeProject(
    [
      makeCargo({ id: "must" }),
      makeCargo({ id: "large", required: false, lengthMm: 200 }),
    ],
    {
      vehicle: { lengthMm: 200, widthMm: 100, heightMm: 100, payloadG: 10000 },
    },
  );
  const r = await search(p, opts(), () => {});
  expect(r.status).toBe("ready");
  expect(r.placements.map((x) => x.instanceId)).toContain("must-001");
});
it("prefers larger optional volume after required cargo", async () => {
  const p = makeProject(
    [
      makeCargo({ id: "small", required: false }),
      makeCargo({ id: "large", required: false, lengthMm: 200 }),
    ],
    {
      vehicle: { lengthMm: 200, widthMm: 100, heightMm: 100, payloadG: 10000 },
    },
  );
  const r = await search(p, opts(), () => {});
  expect(r.placements.map((x) => x.instanceId)).toEqual(["large-001"]);
});
it("distinguishes proof from search exhaustion and preserves cancellation", async () => {
  const p = makeProject([
    makeCargo({ lengthMm: 2000, widthMm: 2000, heightMm: 2000 }),
  ]);
  expect((await search(p, opts(), () => {})).status).toBe("proven-infeasible");
  const q = makeProject();
  expect(
    (await search(q, { ...opts(), maxAttempts: 0 }, () => {})).status,
  ).toBe("not-found");
  const controller = new AbortController();
  controller.abort();
  expect(
    (await search(q, { ...opts(), signal: controller.signal }, () => {}))
      .placements,
  ).toHaveLength(0);
});
it("is reproducible by seed and attempts, including three delivery stops", async () => {
  const p = makeProject([
    makeCargo({ id: "a", stop: 1, quantity: 2 }),
    makeCargo({ id: "b", stop: 2, quantity: 2 }),
    makeCargo({ id: "c", stop: 3, quantity: 2 }),
  ]);
  const a = await search(p, opts(), () => {}),
    b = await search(p, opts(), () => {});
  expect(a.placements).toEqual(b.placements);
  expect(a.report?.valid).toBe(true);
  expect(a.report?.unloadSteps.map((x) => x.stop)).toEqual([1, 1, 2, 2, 3, 3]);
});
