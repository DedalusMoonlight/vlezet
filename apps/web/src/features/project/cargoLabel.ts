import type { ProjectInput } from "@vlezet/domain";

export function cargoInstanceNumber(
  input: ProjectInput,
  instanceId: string,
): number {
  const instance = input.instances.find((i) => i.id === instanceId);
  return (
    input.instances
      .filter((i) => i.typeId === instance?.typeId)
      .findIndex((i) => i.id === instanceId) + 1
  );
}
