import type { ProjectInput, Placement, Orientation } from "@vlezet/domain";
import { orientedDimensions } from "@vlezet/validation";
// A stop occupies one depth section; identical boxes form supported vertical columns.
// This deterministic seed complements extreme-point search on dense repetitive manifests.
export function shelfLayout(
  input: ProjectInput,
  yaw: 0 | 1 = 0,
): Placement[] | null {
  const { wallGapMm: m, horizontalGapMm: g } = input.settings;
  const usableW = input.vehicle.widthMm - 2 * m,
    usableH = input.vehicle.heightMm - m;
  let rear = input.vehicle.lengthMm - m;
  const result: Placement[] = [];
  const stops = [...new Set(input.cargoTypes.map((t) => t.stop))].sort(
    (a, b) => b - a,
  );
  for (const stop of stops) {
    let y = m,
      rowDepth = 0;
    for (const t of input.cargoTypes
      .filter((t) => t.stop === stop)
      .sort((a, b) => b.widthMm - a.widthMm || a.id.localeCompare(b.id))) {
      const orientation: Orientation = {
        downFace: t.allowedDownFaces.includes("-Z")
          ? "-Z"
          : t.allowedDownFaces[0],
        yawQuarterTurns: yaw,
      };
      const [l, w, h] = orientedDimensions(t, orientation);
      if (w > usableW || h > usableH) return null;
      const capacity = Math.max(
        1,
        Math.min(
          Math.floor(usableH / h),
          t.maxTopLoadG === null
            ? t.quantity
            : Math.floor(t.maxTopLoadG / t.massG) + 1,
        ),
      );
      const depth = Math.ceil(t.quantity / capacity) * (l + g) - g;
      if (y + w > input.vehicle.widthMm - m) {
        rear -= rowDepth + g;
        y = m;
        rowDepth = 0;
      }
      if (rear - depth < m) return null;
      const instances = input.instances.filter((i) => i.typeId === t.id);
      instances.forEach((i, k) =>
        result.push({
          instanceId: i.id,
          orientation: { ...orientation },
          position: {
            x: rear - l - Math.floor(k / capacity) * (l + g),
            y,
            z: (k % capacity) * h,
          },
        }),
      );
      y += w + g;
      rowDepth = Math.max(rowDepth, depth);
    }
    rear -= rowDepth + g;
  }
  return result;
}
