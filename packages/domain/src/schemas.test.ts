import { describe, expect, it } from "vitest";
import { parseProject, normalizeMeasure, reconcileInstances } from "./index";

const cargo = {
  id: "a",
  name: "A",
  lengthMm: 100,
  widthMm: 200,
  heightMm: 300,
  massG: 1000,
  quantity: 1,
  stop: 1,
};
const project = () => ({
  schemaVersion: 1,
  revisionId: "r",
  vehicle: { lengthMm: 3000, widthMm: 2000, heightMm: 2000, payloadG: 1000000 },
  cargoTypes: [{ ...cargo }],
  instances: [{ id: "a-1", typeId: "a" }],
  settings: { wallGapMm: 10, horizontalGapMm: 5, supportModel: "support-v1" },
});
describe("input contract", () => {
  it("rejects the reserved floor identifier in imported instances", () => {
    const p = project();
    p.instances[0].id = "floor";
    expect(() => parseProject(p)).toThrow();
  });
  it("makes all boxes required, all six faces allowed and top load unlimited", () => {
    const p = parseProject(project());
    expect(p.cargoTypes[0]).toMatchObject({
      required: true,
      maxTopLoadG: null,
    });
    expect(p.cargoTypes[0].allowedDownFaces).toHaveLength(6);
  });
  it.each([
    { lengthMm: 0 },
    { massG: 0 },
    { quantity: 1.5 },
    { allowedDownFaces: [] },
    { maxTopLoadG: -1 },
    { lengthMm: Infinity },
  ])("rejects invalid cargo %j", (bad) => {
    const p = project();
    Object.assign(p.cargoTypes[0], bad);
    expect(() => parseProject(p)).toThrow();
  });
  it("rejects quantities before expanding and inconsistent instance IDs", () => {
    const p = project();
    p.cargoTypes[0].quantity = 301;
    expect(() => parseProject(p)).toThrow();
    const q = project();
    q.instances.push({ id: "a-1", typeId: "a" });
    expect(() => parseProject(q)).toThrow();
  });
  it("rejects more than 100 types and 20 distinct stops", () => {
    const p = project();
    p.cargoTypes = Array.from({ length: 101 }, (_, i) => ({
      ...cargo,
      id: String(i),
    }));
    p.instances = p.cargoTypes.map((c) => ({ id: c.id, typeId: c.id }));
    expect(() => parseProject(p)).toThrow();
    p.cargoTypes = p.cargoTypes
      .slice(0, 21)
      .map((c, i) => ({ ...c, stop: i + 1 }));
    p.instances = p.cargoTypes.map((c) => ({ id: c.id, typeId: c.id }));
    expect(() => parseProject(p)).toThrow();
  });
  it("normalizes comma decimals and asks before losing precision", () => {
    expect(normalizeMeasure("12,5", "cm")).toEqual({ ok: true, value: 125 });
    expect(normalizeMeasure("1.25", "kg")).toEqual({ ok: true, value: 1250 });
    expect(normalizeMeasure("0.01", "cm")).toMatchObject({
      ok: false,
      rounded: 0,
    });
    expect(normalizeMeasure("abc", "mm").ok).toBe(false);
  });
  it("keeps instance IDs when quantities grow and rejects unknown types", () => {
    const p = parseProject(project());
    const ids = reconcileInstances(p.instances, [
      { ...p.cargoTypes[0], quantity: 3 },
    ]);
    expect(ids).toHaveLength(3);
    expect(ids[0].id).toBe("a-1");
    expect(new Set(ids.map((x) => x.id)).size).toBe(3);
    const q = project();
    q.instances[0].typeId = "missing";
    expect(() => parseProject(q)).toThrow();
  });
});
