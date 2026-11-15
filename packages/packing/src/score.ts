import type { ProjectInput, Placement, CargoType } from "../../domain/src";
import { orientedBox } from "../../validation/src";
export const volume = (t: CargoType) => t.lengthMm * t.widthMm * t.heightMm;
export function score(input: ProjectInput, placements: Placement[]): number[] {
  let required = 0,
    requiredVolume = 0,
    optionalVolume = 0,
    height = 0;
  for (const p of placements) {
    const t = input.cargoTypes.find(
      (t) =>
        t.id === input.instances.find((i) => i.id === p.instanceId)!.typeId,
    )!;
    if (t.required) {
      required++;
      requiredVolume += volume(t);
    } else optionalVolume += volume(t);
    height = Math.max(height, orientedBox(t, p).max.z);
  }
  return [required, requiredVolume, optionalVolume, -height];
}
export function better(a: number[], b: number[]): boolean {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
}
