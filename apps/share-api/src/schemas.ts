import { z } from "zod";
import { parseProject } from "@vlezet/domain";
import { restoreSolution } from "@vlezet/io";
import { validatePlan } from "@vlezet/validation";
export function canonicalSnapshot(raw: unknown) {
  const v = z
    .object({
      schemaVersion: z.literal(1),
      input: z.unknown(),
      solution: z.object({ status: z.literal("ready") }).passthrough(),
    })
    .parse(raw);
  const input = parseProject(v.input);
  const solution = restoreSolution(input, v.solution);
  if (
    !solution ||
    solution.status !== "ready" ||
    !validatePlan(input, solution.placements).valid
  )
    throw new Error("Требуется текущий полный допустимый план");
  return { schemaVersion: 1 as const, input, solution };
}
