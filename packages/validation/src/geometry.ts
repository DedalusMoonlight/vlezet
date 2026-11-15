import type { ProjectInput, Placement } from "../../domain/src";
import { orientedBox } from "./orientation";
import { issue, type Box, type Rect, type ValidationIssue } from "./issues";
export const intervalOverlap = (
  a0: number,
  a1: number,
  b0: number,
  b1: number,
) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
export const overlapVolume = (a: Box, b: Box) =>
  intervalOverlap(a.min.x, a.max.x, b.min.x, b.max.x) *
  intervalOverlap(a.min.y, a.max.y, b.min.y, b.max.y) *
  intervalOverlap(a.min.z, a.max.z, b.min.z, b.max.z);
export const baseRect = (b: Box): Rect => ({
  x0: b.min.x,
  x1: b.max.x,
  y0: b.min.y,
  y1: b.max.y,
});
export const rectArea = (r: Rect) =>
  Math.max(0, r.x1 - r.x0) * Math.max(0, r.y1 - r.y0);
export const intersectRect = (a: Rect, b: Rect): Rect => ({
  x0: Math.max(a.x0, b.x0),
  y0: Math.max(a.y0, b.y0),
  x1: Math.min(a.x1, b.x1),
  y1: Math.min(a.y1, b.y1),
});
export function rectUnionArea(input: Rect[]): number {
  const rects = input.filter((r) => rectArea(r) > 0);
  const xs = [...new Set(rects.flatMap((r) => [r.x0, r.x1]))].sort(
    (a, b) => a - b,
  );
  let area = 0;
  for (let i = 1; i < xs.length; i++) {
    const x = (xs[i - 1] + xs[i]) / 2;
    const ys = rects
      .filter((r) => r.x0 < x && r.x1 > x)
      .map((r) => [r.y0, r.y1])
      .sort((a, b) => a[0] - b[0]);
    let length = 0,
      end = -Infinity;
    for (const [a, b] of ys) {
      length += Math.max(0, b - Math.max(a, end));
      end = Math.max(end, b);
    }
    area += (xs[i] - xs[i - 1]) * length;
  }
  return area;
}
export const coversRect = (base: Rect, rects: Rect[]) =>
  rectUnionArea(rects.map((r) => intersectRect(base, r))) === rectArea(base);
export function geometryIssues(
  input: ProjectInput,
  placements: Placement[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { vehicle: v, settings: s } = input;
  const boxes: { p: Placement; b: Box }[] = [];
  for (const p of placements) {
    const instance = input.instances.find((i) => i.id === p.instanceId);
    const t = input.cargoTypes.find((c) => c.id === instance?.typeId);
    if (!t) {
      issues.push(issue("unknown-id", [p.instanceId], "Неизвестная коробка"));
      continue;
    }
    if (
      !t.allowedDownFaces.includes(p.orientation.downFace) ||
      ![0, 1, 2, 3].includes(p.orientation.yawQuarterTurns)
    ) {
      issues.push(
        issue("orientation", [p.instanceId], "Недопустимое положение коробки"),
      );
      continue;
    }
    if (
      !Object.values(p.position).every(
        (n) => Number.isFinite(n) && Number.isInteger(n),
      )
    ) {
      issues.push(
        issue(
          "position",
          [p.instanceId],
          "Координаты должны быть целыми миллиметрами",
        ),
      );
      continue;
    }
    const b = orientedBox(t, p);
    boxes.push({ p, b });
    if (
      b.min.x < s.wallGapMm ||
      b.min.y < s.wallGapMm ||
      b.min.z < 0 ||
      b.max.x > v.lengthMm - s.wallGapMm ||
      b.max.y > v.widthMm - s.wallGapMm ||
      b.max.z > v.heightMm - s.wallGapMm
    )
      issues.push(
        issue(
          "bounds",
          [p.instanceId],
          "Коробка выходит за полезный объём или зазор у стен",
        ),
      );
  }
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i],
        b = boxes[j],
        g = s.horizontalGapMm;
      if (
        intervalOverlap(a.b.min.z, a.b.max.z, b.b.min.z, b.b.max.z) > 0 &&
        !(
          a.b.max.x + g <= b.b.min.x ||
          b.b.max.x + g <= a.b.min.x ||
          a.b.max.y + g <= b.b.min.y ||
          b.b.max.y + g <= a.b.min.y
        )
      )
        issues.push(
          issue(
            "overlap-or-gap",
            [a.p.instanceId, b.p.instanceId],
            "Коробки пересекаются или не выдержан зазор",
          ),
        );
    }
  return issues;
}
