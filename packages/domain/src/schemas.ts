import { z } from "zod";
import type { ProjectInput } from "./types";
export const faces = ["+X", "-X", "+Y", "-Y", "+Z", "-Z"] as const;
const id = z.string().min(1).max(120);
const size = z.number().int().positive().max(100000);
const mass = z.number().int().positive().max(100000000);
export const cargoSchema = z.object({
  id,
  name: z.string().trim().min(1).max(120),
  lengthMm: size,
  widthMm: size,
  heightMm: size,
  massG: mass,
  quantity: z.number().int().min(1).max(300),
  stop: z.number().int().positive().max(100000),
  required: z.boolean().default(true),
  allowedDownFaces: z
    .array(z.enum(faces))
    .min(1)
    .max(6)
    .default([...faces]),
  maxTopLoadG: z.number().int().min(0).max(100000000).nullable().default(null),
});
export const projectSchema = z
  .object({
    schemaVersion: z.literal(1),
    revisionId: id,
    vehicle: z.object({
      lengthMm: size,
      widthMm: size,
      heightMm: size,
      payloadG: mass,
    }),
    cargoTypes: z.array(cargoSchema).max(100),
    instances: z.array(z.object({ id, typeId: id })).max(300),
    settings: z.object({
      wallGapMm: z.number().int().min(0).max(1000),
      horizontalGapMm: z.number().int().min(0).max(1000),
      supportModel: z.literal("support-v1"),
    }),
  })
  .superRefine((p, ctx) => {
    const issue = (message: string) =>
      ctx.addIssue({ code: "custom", message });
    if (p.cargoTypes.reduce((n, c) => n + c.quantity, 0) > 300)
      issue("Не более 300 коробок");
    if (new Set(p.cargoTypes.map((c) => c.stop)).size > 20)
      issue("Не более 20 остановок");
    if (new Set(p.cargoTypes.map((c) => c.id)).size !== p.cargoTypes.length)
      issue("Повторяющиеся ID типов");
    if (new Set(p.instances.map((c) => c.id)).size !== p.instances.length)
      issue("Повторяющиеся ID коробок");
    const ids = new Set(p.cargoTypes.map((c) => c.id));
    if (p.instances.some((i) => !ids.has(i.typeId)))
      issue("Неизвестный тип коробки");
    for (const c of p.cargoTypes)
      if (p.instances.filter((i) => i.typeId === c.id).length !== c.quantity)
        issue("Количество экземпляров не совпадает с количеством груза");
  });
export function parseProject(value: unknown): ProjectInput {
  return projectSchema.parse(value);
}
