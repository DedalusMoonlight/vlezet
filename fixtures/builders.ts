import {
  parseProject,
  reconcileInstances,
  faces,
  type CargoType,
  type ProjectInput,
  type Placement,
} from "../packages/domain/src";
export const makeCargo = (overrides: Partial<CargoType> = {}): CargoType => ({
  id: "a",
  name: "Коробка",
  lengthMm: 100,
  widthMm: 100,
  heightMm: 100,
  massG: 1000,
  quantity: 1,
  stop: 1,
  required: true,
  allowedDownFaces: [...faces],
  maxTopLoadG: null,
  ...overrides,
});
export function makeProject(
  types: CargoType[] = [makeCargo()],
  overrides: Partial<ProjectInput> = {},
): ProjectInput {
  return parseProject({
    schemaVersion: 1,
    revisionId: "r1",
    vehicle: {
      lengthMm: 1000,
      widthMm: 1000,
      heightMm: 1000,
      payloadG: 100000,
    },
    settings: { wallGapMm: 0, horizontalGapMm: 0, supportModel: "support-v1" },
    cargoTypes: types,
    instances: reconcileInstances([], types),
    ...overrides,
  });
}
export const place = (instanceId: string, x = 0, y = 0, z = 0): Placement => ({
  instanceId,
  position: { x, y, z },
  orientation: { downFace: "-Z", yawQuarterTurns: 0 },
});
