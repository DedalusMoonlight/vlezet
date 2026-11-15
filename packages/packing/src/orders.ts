import type { ProjectInput } from "../../domain/src";
import { volume } from "./score";
export function orderedInstances(
  input: ProjectInput,
  attempt: number,
  seed: number,
) {
  const type = new Map(input.cargoTypes.map((t) => [t.id, t]));
  let state = (seed + attempt * 2654435761) >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const jitter = new Map(input.instances.map((i) => [i.id, random()]));
  return [...input.instances].sort((a, b) => {
    const x = type.get(a.typeId)!,
      y = type.get(b.typeId)!;
    const required =
      attempt % 4 === 0 ? Number(y.required) - Number(x.required) : 0;
    return (
      required ||
      y.stop - x.stop ||
      (attempt % 4 === 1
        ? y.massG - x.massG
        : attempt % 4 === 2
          ? volume(x) - volume(y)
          : attempt % 4 === 3
            ? jitter.get(a.id)! - jitter.get(b.id)!
            : volume(y) - volume(x)) ||
      a.id.localeCompare(b.id)
    );
  });
}
