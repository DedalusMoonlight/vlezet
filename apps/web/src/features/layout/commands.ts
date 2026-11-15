import type {
  ProjectInput,
  Vec3Mm,
  Orientation,
  Placement,
} from "@vlezet/domain";
import type { Solution } from "@vlezet/packing";
import { validatePlan, type ValidationReport } from "@vlezet/validation";
export type MoveCommand =
  | { kind: "move"; instanceId: string; position: Vec3Mm }
  | { kind: "rotate"; instanceId: string; orientation: Orientation };
export function previewEdit(
  input: ProjectInput,
  solution: Solution,
  command: MoveCommand,
): { accepted: boolean; placements: Placement[]; report: ValidationReport } {
  const current = validatePlan(input, solution.placements, {
    requireAllRequired: false,
  });
  if (
    solution.inputRevisionId !== input.revisionId ||
    !current.valid ||
    !solution.placements.some((p) => p.instanceId === command.instanceId)
  )
    return {
      accepted: false,
      placements: solution.placements,
      report: {
        ...current,
        valid: false,
        issues: [
          {
            code: "stale",
            instanceIds: [],
            message: "Пересчитайте текущий план",
          },
        ],
      },
    };
  if (current.supports.contacts.some((c) => c.lowerId === command.instanceId))
    return {
      accepted: false,
      placements: solution.placements,
      report: {
        ...current,
        valid: false,
        issues: [
          {
            code: "support-in-use",
            instanceIds: [command.instanceId],
            message:
              "Сначала переместите все коробки сверху. Нельзя вынимать опору.",
          },
        ],
      },
    };
  const placements = solution.placements.map((p) =>
    p.instanceId !== command.instanceId
      ? p
      : command.kind === "move"
        ? { ...p, position: command.position }
        : { ...p, orientation: command.orientation },
  );
  const report = validatePlan(input, placements, {
    requireAllRequired: solution.status === "ready",
  });
  return { accepted: report.valid, placements, report };
}
export type History = {
  past: Solution[];
  present: Solution;
  future: Solution[];
};
export const historyPush = (h: History, s: Solution): History => ({
  past: [...h.past, h.present].slice(-50),
  present: s,
  future: [],
});
export function historyUndo(h: History): History {
  return h.past.length
    ? {
        past: h.past.slice(0, -1),
        present: h.past.at(-1)!,
        future: [h.present, ...h.future],
      }
    : h;
}
export function historyRedo(h: History): History {
  return h.future.length
    ? {
        past: [...h.past, h.present],
        present: h.future[0],
        future: h.future.slice(1),
      }
    : h;
}
