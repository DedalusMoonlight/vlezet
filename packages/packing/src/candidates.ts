import type { ProjectInput, Placement, Vec3Mm } from "../../domain/src";
import { orientedBox } from "../../validation/src";
export function candidates(
  input: ProjectInput,
  placements: Placement[],
  dims: [number, number, number],
): Vec3Mm[] {
  const [l, w, h] = dims,
    { wallGapMm: m, horizontalGapMm: g } = input.settings;
  const v = input.vehicle;
  const result = new Map<string, Vec3Mm>();
  const add = (x: number, y: number, z: number) => {
    if (
      x < m ||
      y < m ||
      z < 0 ||
      x + l > v.lengthMm - m ||
      y + w > v.widthMm - m ||
      z + h > v.heightMm - m
    )
      return;
    result.set(`${x}:${y}:${z}`, { x, y, z });
  };
  add(v.lengthMm - m - l, m, 0);
  add(m, m, 0);
  add(v.lengthMm - m - l, v.widthMm - m - w, 0);
  for (const p of placements) {
    const t = input.cargoTypes.find(
      (t) =>
        t.id === input.instances.find((i) => i.id === p.instanceId)!.typeId,
    )!;
    const b = orientedBox(t, p);
    const xs = [
      m,
      v.lengthMm - m - l,
      b.min.x,
      b.max.x - l,
      b.min.x - l - g,
      b.max.x + g,
    ];
    const ys = [m, b.min.y, b.max.y - w, b.min.y - w - g, b.max.y + g];
    for (const z of [0, b.min.z, b.max.z])
      for (const x of xs) for (const y of ys) add(x, y, z);
  }
  return [...result.values()].sort(
    (a, b) => a.z - b.z || b.x - a.x || a.y - b.y,
  );
}
