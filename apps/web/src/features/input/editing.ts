import {
  parseProject,
  reconcileInstances,
  type CargoType,
  type ProjectInput,
} from "@vlezet/domain";
export function replaceCargo(
  input: ProjectInput,
  types: CargoType[],
): ProjectInput {
  return parseProject({
    ...input,
    cargoTypes: types,
    instances: reconcileInstances(input.instances, types),
  });
}
export function splitRequired(
  input: ProjectInput,
  id: string,
  count: number,
): ProjectInput {
  const c = input.cargoTypes.find((t) => t.id === id);
  if (!c || !Number.isInteger(count) || count < 1 || count >= c.quantity)
    throw new Error("Отделите от 1 до количества минус 1 коробок");
  return replaceCargo(input, [
    ...input.cargoTypes.map((t) =>
      t.id === id ? { ...t, quantity: t.quantity - count } : t,
    ),
    { ...c, id: crypto.randomUUID(), quantity: count, required: !c.required },
  ]);
}
