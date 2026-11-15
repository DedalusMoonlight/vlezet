import { z } from "zod";
import {
  parseProject,
  faces,
  type ProjectInput,
  type Placement,
} from "../../domain/src";
import { geometryIssues, intervalOverlap } from "./geometry";
import { orientedBox } from "./orientation";
import { buildSupports, type SupportAnalysis } from "./supports";
import { calculateLoads, type LoadAnalysis } from "./loads";
import { planSequence, type InstructionStep } from "./sequence";
import { issue, type ValidationIssue } from "./issues";
export type ValidationReport = {
  valid: boolean;
  issues: ValidationIssue[];
  supports: SupportAnalysis;
  loads: LoadAnalysis;
  unloadSteps: InstructionStep[];
  loadSteps: InstructionStep[];
};
export const placementSchema = z.object({
  instanceId: z.string().min(1).max(120),
  position: z.object({
    x: z.number().int(),
    y: z.number().int(),
    z: z.number().int(),
  }),
  orientation: z.object({
    downFace: z.enum(faces),
    yawQuarterTurns: z.union([
      z.literal(0),
      z.literal(1),
      z.literal(2),
      z.literal(3),
    ]),
  }),
});
const blank = (issues: ValidationIssue[]): ValidationReport => ({
  valid: false,
  issues,
  supports: { contacts: [], issues: [] },
  loads: { topLoadG: {}, floorLoadG: 0, issues: [] },
  unloadSteps: [],
  loadSteps: [],
});
export function validateLayout(
  input: ProjectInput,
  placements: Placement[],
  requireAllRequired = false,
): ValidationReport {
  const issues = geometryIssues(input, placements);
  const ids = placements.map((p) => p.instanceId);
  if (new Set(ids).size !== ids.length)
    issues.push(issue("duplicate-id", ids, "Одна коробка размещена дважды"));
  if (issues.length) return blank(issues);
  const types = new Map(input.cargoTypes.map((t) => [t.id, t]));
  const instances = new Map(input.instances.map((i) => [i.id, i]));
  const totalMass = ids.reduce(
    (s, id) => s + types.get(instances.get(id)!.typeId)!.massG,
    0,
  );
  if (totalMass > input.vehicle.payloadG)
    issues.push(issue("payload", [], "Превышена допустимая масса груза"));
  if (requireAllRequired) {
    const missing = input.instances.filter(
      (i) => types.get(i.typeId)!.required && !ids.includes(i.id),
    );
    if (missing.length)
      issues.push(
        issue(
          "required",
          missing.map((i) => i.id),
          "Не все обязательные коробки размещены",
        ),
      );
  }
  const supports = buildSupports(input, placements),
    loads = calculateLoads(input, supports);
  issues.push(...supports.issues, ...loads.issues);
  const sequence = planSequence(input, placements, supports);
  issues.push(...sequence.issues);
  return {
    valid: issues.length === 0,
    issues,
    supports,
    loads,
    unloadSteps: sequence.unloadSteps,
    loadSteps: sequence.loadSteps,
  };
}
export function validatePlan(
  raw: ProjectInput,
  rawPlacements: Placement[],
  options: { requireAllRequired?: boolean } = {},
): ValidationReport {
  let input: ProjectInput, placements: Placement[];
  try {
    input = parseProject(raw);
    placements = z.array(placementSchema).max(300).parse(rawPlacements);
  } catch {
    return blank([
      issue("input", [], "Некорректные данные проекта или размещения"),
    ]);
  }
  const report = validateLayout(
    input,
    placements,
    options.requireAllRequired ?? true,
  );
  if (!report.valid) return report;
  // Independently replay every extraction, then the reverse insertion prefixes.
  let remaining = [...placements];
  for (const step of report.unloadSteps) {
    const p = remaining.find((x) => x.instanceId === step.instanceId)!;
    const type = input.cargoTypes.find(
      (t) =>
        t.id === input.instances.find((i) => i.id === p.instanceId)!.typeId,
    )!;
    const box = orientedBox(type, p);
    const g = input.settings.horizontalGapMm;
    for (const other of remaining) {
      if (other === p) continue;
      const t = input.cargoTypes.find(
        (t) =>
          t.id ===
          input.instances.find((i) => i.id === other.instanceId)!.typeId,
      )!;
      const b = orientedBox(t, other);
      if (
        b.min.x < box.max.x &&
        b.max.x > step.to.x &&
        intervalOverlap(b.min.z, b.max.z, box.min.z, box.max.z) > 0 &&
        b.min.y < box.max.y + g &&
        b.max.y + g > box.min.y
      )
        report.issues.push(
          issue(
            "path",
            [step.instanceId, other.instanceId],
            "Путь извлечения заблокирован",
          ),
        );
    }
    remaining = remaining.filter((x) => x !== p);
    report.issues.push(...validateLayout(input, remaining).issues);
  }
  const loaded: Placement[] = [];
  for (const step of report.loadSteps) {
    loaded.push(placements.find((p) => p.instanceId === step.instanceId)!);
    report.issues.push(...validateLayout(input, loaded).issues);
  }
  report.valid = report.issues.length === 0;
  return report;
}
