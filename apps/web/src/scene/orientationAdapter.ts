import { Matrix4, Quaternion } from "three";
import type { Orientation, Vec3Mm } from "@vlezet/domain";
import { orientationAxes } from "@vlezet/validation";
export const scenePosition = (p: Vec3Mm): [number, number, number] => [
  p.x / 1000,
  p.z / 1000,
  -p.y / 1000,
];
export function sceneQuaternion(o: Orientation): Quaternion {
  const [x, y, z] = orientationAxes(o);
  return new Quaternion().setFromRotationMatrix(
    new Matrix4().set(
      x[0],
      x[1],
      x[2],
      0,
      z[0],
      z[1],
      z[2],
      0,
      -y[0],
      -y[1],
      -y[2],
      0,
      0,
      0,
      0,
      1,
    ),
  );
}
