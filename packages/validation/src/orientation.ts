import type { CargoType, Orientation, Placement } from "../../domain/src";
import type { Box } from "./issues";
type Axis = [number, number, number];
const cross = (a: Axis, b: Axis): Axis => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
// Rows map local, physically labelled box axes to the world X/Y/Z axes.
export function orientationAxes(o: Orientation): [Axis, Axis, Axis] {
  const z: Axis = [0, 0, 0];
  z["XYZ".indexOf(o.downFace[1])] = o.downFace[0] === "-" ? 1 : -1;
  let x: Axis = Math.abs(z[0]) === 1 ? [0, 1, 0] : [1, 0, 0];
  let y = cross(z, x);
  for (let i = 0; i < o.yawQuarterTurns; i++) {
    const old = x;
    x = y.map((v) => -v) as Axis;
    y = old;
  }
  return [x, y, z];
}
export function enumerateOrientations(type: CargoType): Orientation[] {
  return [...new Set(type.allowedDownFaces)].flatMap((downFace) =>
    ([0, 1, 2, 3] as const).map((yawQuarterTurns) => ({
      downFace,
      yawQuarterTurns,
    })),
  );
}
export function orientedDimensions(
  type: CargoType,
  o: Orientation,
): [number, number, number] {
  const d = [type.lengthMm, type.widthMm, type.heightMm];
  return orientationAxes(o).map((a) =>
    a.reduce((s, v, i) => s + Math.abs(v) * d[i], 0),
  ) as [number, number, number];
}
export function orientedBox(type: CargoType, p: Placement): Box {
  const [x, y, z] = orientedDimensions(type, p.orientation);
  return {
    min: { ...p.position },
    max: { x: p.position.x + x, y: p.position.y + y, z: p.position.z + z },
  };
}
