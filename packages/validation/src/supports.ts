import type { ProjectInput, Placement } from "../../domain/src";
import { orientedBox } from "./orientation";
import {
  baseRect,
  intersectRect,
  rectArea,
  rectUnionArea,
  coversRect,
} from "./geometry";
import { issue, type Rect, type ValidationIssue } from "./issues";
export type Contact = {
  upperId: string;
  lowerId: string;
  rect: Rect;
  areaMm2: number;
};
export type SupportAnalysis = {
  contacts: Contact[];
  issues: ValidationIssue[];
};
export function buildSupports(
  input: ProjectInput,
  placements: Placement[],
): SupportAnalysis {
  const contacts: Contact[] = [],
    issues: ValidationIssue[] = [];
  const boxes = placements.flatMap((p) => {
    const type = input.cargoTypes.find(
      (t) =>
        t.id === input.instances.find((i) => i.id === p.instanceId)?.typeId,
    );
    return type ? [{ id: p.instanceId, box: orientedBox(type, p) }] : [];
  });
  for (const upper of boxes) {
    const base = baseRect(upper.box);
    if (upper.box.min.z === 0) {
      contacts.push({
        upperId: upper.id,
        lowerId: "floor",
        rect: base,
        areaMm2: rectArea(base),
      });
      continue;
    }
    const local: Contact[] = [];
    for (const lower of boxes) {
      if (upper.id === lower.id || lower.box.max.z !== upper.box.min.z)
        continue;
      const rect = intersectRect(base, baseRect(lower.box));
      const areaMm2 = rectArea(rect);
      if (areaMm2 > 0)
        local.push({ upperId: upper.id, lowerId: lower.id, rect, areaMm2 });
    }
    contacts.push(...local);
    const actual = local.map((c) => c.rect);
    const area = rectUnionArea(actual);
    if (area * 100 < 95 * rectArea(base))
      issues.push(
        issue("support-area", [upper.id], "Поддерживается менее 95% дна"),
      );
    const corners = [
      [base.x0, base.y0],
      [base.x0, base.y1],
      [base.x1, base.y0],
      [base.x1, base.y1],
    ];
    if (
      !corners.every(([x, y]) =>
        actual.some((r) => r.x0 <= x && x <= r.x1 && r.y0 <= y && y <= r.y1),
      )
    )
      issues.push(
        issue("support-corners", [upper.id], "Угол коробки выходит за опору"),
      );
    const g = Math.min(input.settings.horizontalGapMm, 5);
    const doubled = (r: Rect): Rect => ({
      x0: r.x0 * 2,
      y0: r.y0 * 2,
      x1: r.x1 * 2,
      y1: r.y1 * 2,
    });
    const expanded = actual.map((r) => ({
      x0: r.x0 * 2 - g,
      y0: r.y0 * 2 - g,
      x1: r.x1 * 2 + g,
      y1: r.y1 * 2 + g,
    }));
    if (!coversRect(doubled(base), expanded))
      issues.push(
        issue(
          "support-gap",
          [upper.id],
          g
            ? "Слишком широкий промежуток между опорами"
            : "Требуется полное покрытие дна",
        ),
      );
  }
  return { contacts, issues };
}
