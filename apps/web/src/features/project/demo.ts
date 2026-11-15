import { randomId } from "@vlezet/domain";
import {
  reconcileInstances,
  faces,
  type ProjectInput,
  type CargoType,
} from "../../../../../packages/domain/src";
export function demoProject(): ProjectInput {
  const cargoTypes: CargoType[] = [
    {
      id: "goods",
      name: "Товары в коробках",
      lengthMm: 600,
      widthMm: 400,
      heightMm: 400,
      massG: 15000,
      quantity: 8,
      stop: 3,
      required: true,
      allowedDownFaces: [...faces],
      maxTopLoadG: null,
    },
    {
      id: "orders",
      name: "Заказы магазина",
      lengthMm: 400,
      widthMm: 400,
      heightMm: 300,
      massG: 10000,
      quantity: 6,
      stop: 2,
      required: true,
      allowedDownFaces: ["-Z"],
      maxTopLoadG: null,
    },
    {
      id: "fragile",
      name: "Хрупкое",
      lengthMm: 600,
      widthMm: 400,
      heightMm: 300,
      massG: 8000,
      quantity: 4,
      stop: 1,
      required: true,
      allowedDownFaces: ["-Z"],
      maxTopLoadG: 0,
    },
  ];
  return {
    schemaVersion: 1,
    revisionId: randomId(),
    vehicle: {
      lengthMm: 2400,
      widthMm: 1600,
      heightMm: 1500,
      payloadG: 1000000,
    },
    cargoTypes,
    instances: reconcileInstances([], cargoTypes),
    settings: { wallGapMm: 10, horizontalGapMm: 5, supportModel: "support-v1" },
  };
}
