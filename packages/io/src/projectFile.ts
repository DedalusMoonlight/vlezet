import { z } from "zod";
import { parseProject, type ProjectInput } from "@vlezet/domain";
import {
  validatePlan,
  placementSchema,
  orientedDimensions,
  infeasibilityProof,
} from "@vlezet/validation";
import type { Solution } from "@vlezet/packing";
const portableSolution = z.object({
  inputRevisionId: z.string(),
  placements: z.array(placementSchema).max(300),
  run: z.object({
    seed: z.number().int(),
    algorithmVersion: z.string().max(100),
    attempts: z.number().int().nonnegative(),
  }),
});
export function restoreSolution(
  input: ProjectInput,
  raw: unknown,
): Solution | null {
  if (raw == null) return null;
  const saved = portableSolution.parse(raw);
  if (saved.inputRevisionId !== input.revisionId) return null;
  const report = validatePlan(input, saved.placements, {
    requireAllRequired: false,
  });
  if (!report.valid) throw new Error("Недопустимая раскладка в файле");
  const ids = new Set(saved.placements.map((p) => p.instanceId));
  const unplaced = input.instances.filter((i) => !ids.has(i.id));
  let volume = 0,
    mass = 0;
  for (const p of saved.placements) {
    const c = input.cargoTypes.find(
      (c) =>
        c.id === input.instances.find((i) => i.id === p.instanceId)!.typeId,
    )!;
    volume += orientedDimensions(c, p.orientation).reduce((a, b) => a * b, 1);
    mass += c.massG;
  }
  const proof = infeasibilityProof(input);
  return {
    ...saved,
    unplacedIds: unplaced.map((i) => i.id),
    status: proof.length
      ? "proven-infeasible"
      : unplaced.some(
            (i) => input.cargoTypes.find((t) => t.id === i.typeId)!.required,
          )
        ? saved.placements.length
          ? "partial"
          : "not-found"
        : "ready",
    report,
    issues: proof,
    metrics: {
      placedCount: ids.size,
      placedVolumeMm3: volume,
      totalMassG: mass,
    },
  };
}
export function encodeProject(
  input: ProjectInput,
  solution: Solution | null,
  state: { cancelled?: boolean } = {},
): Uint8Array {
  return new TextEncoder().encode(
    JSON.stringify({
      format: "vlezet",
      schemaVersion: 1,
      input: parseProject(input),
      cancelled: state.cancelled ?? false,
      solution: solution
        ? {
            inputRevisionId: solution.inputRevisionId,
            placements: solution.placements,
            run: solution.run,
          }
        : null,
    }),
  );
}
export function decodeProject(bytes: Uint8Array): {
  input: ProjectInput;
  solution: Solution | null;
  cancelled: boolean;
} {
  if (bytes.length > 1024 * 1024) throw new Error("JSON больше 1 МиБ");
  const raw = z
    .object({
      format: z.literal("vlezet"),
      schemaVersion: z.literal(1),
      input: z.unknown(),
      solution: z.unknown(),
      cancelled: z.boolean().default(false),
    })
    .parse(JSON.parse(new TextDecoder().decode(bytes)));
  const input = parseProject(raw.input);
  return {
    input,
    solution: restoreSolution(input, raw.solution),
    cancelled: raw.cancelled,
  };
}
