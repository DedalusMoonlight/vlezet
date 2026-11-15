import type { ProjectInput, Placement, Vec3Mm } from "../../domain/src";
import type { SupportAnalysis } from "./supports";
import { issue, type ValidationIssue } from "./issues";
import { orientedBox } from "./orientation";
import { intervalOverlap } from "./geometry";
export type InstructionStep = {
  index: number;
  instanceId: string;
  stop: number;
  from: Vec3Mm;
  to: Vec3Mm;
};
export function planSequence(
  input: ProjectInput,
  placements: Placement[],
  supports: SupportAnalysis,
): {
  issues: ValidationIssue[];
  unloadSteps: InstructionStep[];
  loadSteps: InstructionStep[];
} {
  const nodes = placements.map((p) => {
    const type = input.cargoTypes.find(
      (t) =>
        t.id === input.instances.find((i) => i.id === p.instanceId)!.typeId,
    )!;
    return { p, type, b: orientedBox(type, p) };
  });
  const edges = new Map(nodes.map((n) => [n.p.instanceId, new Set<string>()]));
  const issues: ValidationIssue[] = [];
  for (const c of supports.contacts)
    if (c.lowerId !== "floor") edges.get(c.upperId)?.add(c.lowerId);
  for (const a of nodes)
    for (const b of nodes) {
      if (a === b) continue;
      const g = input.settings.horizontalGapMm;
      if (
        a.b.max.x <= b.b.min.x &&
        intervalOverlap(a.b.min.z, a.b.max.z, b.b.min.z, b.b.max.z) > 0 &&
        a.b.min.y < b.b.max.y + g &&
        a.b.max.y + g > b.b.min.y
      )
        edges.get(a.p.instanceId)!.add(b.p.instanceId);
    }
  const byId = new Map(nodes.map((n) => [n.p.instanceId, n]));
  const degree = new Map(nodes.map((n) => [n.p.instanceId, 0]));
  for (const [a, targets] of edges)
    for (const b of targets) {
      degree.set(b, degree.get(b)! + 1);
      if (byId.get(a)!.type.stop > byId.get(b)!.type.stop)
        issues.push(
          issue(
            "stop-order",
            [a, b],
            "Для ранней остановки пришлось бы снять более поздний груз",
          ),
        );
    }
  const cmp = (a: string, b: string) =>
    byId.get(a)!.type.stop - byId.get(b)!.type.stop || a.localeCompare(b);
  const queue = [...degree.keys()]
    .filter((id) => degree.get(id) === 0)
    .sort(cmp);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const child of edges.get(id)!) {
      degree.set(child, degree.get(child)! - 1);
      if (degree.get(child) === 0) queue.push(child);
    }
    queue.sort(cmp);
  }
  if (order.length !== nodes.length)
    issues.push(
      issue(
        "sequence-cycle",
        [],
        "Невозможно построить прямую последовательность выгрузки",
      ),
    );
  const unloadSteps = order.map((id, index) => {
    const { p, type, b } = byId.get(id)!;
    return {
      index,
      instanceId: id,
      stop: type.stop,
      from: { ...p.position },
      to: { ...p.position, x: -(b.max.x - b.min.x) - 10 },
    };
  });
  return {
    issues,
    unloadSteps,
    loadSteps: [...unloadSteps]
      .reverse()
      .map((s, index) => ({ ...s, index, from: s.to, to: s.from })),
  };
}
