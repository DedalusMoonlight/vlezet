import type { CargoInstance, CargoType } from "./types";
export function reconcileInstances(
  previous: CargoInstance[],
  types: CargoType[],
): CargoInstance[] {
  return types.flatMap((t) => {
    const keep = previous.filter((i) => i.typeId === t.id).slice(0, t.quantity);
    const used = new Set(previous.map((i) => i.id));
    let ordinal = 1;
    while (keep.length < t.quantity) {
      const id = `${t.id}-${String(ordinal++).padStart(3, "0")}`;
      if (!used.has(id)) {
        keep.push({ id, typeId: t.id });
        used.add(id);
      }
    }
    return keep;
  });
}
