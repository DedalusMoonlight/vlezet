import type { ProjectInput } from "../../domain/src";
import { issue, type ValidationIssue } from "./issues";
import type { SupportAnalysis } from "./supports";
export type LoadAnalysis = {
  topLoadG: Record<string, number>;
  floorLoadG: number;
  issues: ValidationIssue[];
};
export function calculateLoads(
  input: ProjectInput,
  supports: SupportAnalysis,
): LoadAnalysis {
  const issues: ValidationIssue[] = [];
  const ids = [...new Set(supports.contacts.map((c) => c.upperId))];
  const topLoadG: Record<string, number> = Object.create(null);
  const degree = new Map(ids.map((id) => [id, 0]));
  let floorLoadG = 0;
  for (const id of ids) topLoadG[id] = 0;
  for (const c of supports.contacts)
    if (c.lowerId !== "floor") {
      if (!degree.has(c.lowerId)) {
        issues.push(issue("support-id", [c.lowerId], "Неизвестная опора"));
        continue;
      }
      degree.set(c.lowerId, degree.get(c.lowerId)! + 1);
    }
  const queue = ids.filter((id) => degree.get(id) === 0).sort();
  let processed = 0;
  while (queue.length) {
    const id = queue.shift()!;
    processed++;
    const type = input.cargoTypes.find(
      (t) => t.id === input.instances.find((i) => i.id === id)?.typeId,
    );
    if (!type) {
      issues.push(issue("support-id", [id], "Неизвестная коробка"));
      continue;
    }
    if (type.maxTopLoadG !== null && topLoadG[id] > type.maxTopLoadG + 1e-6)
      issues.push(
        issue(
          "top-load",
          [id],
          `Нагрузка сверху превышает ${type.maxTopLoadG / 1000} кг`,
        ),
      );
    const outgoing = supports.contacts.filter((c) => c.upperId === id);
    const area = outgoing.reduce((s, c) => s + c.areaMm2, 0);
    const total = type.massG + topLoadG[id];
    let remaining = total;
    outgoing.forEach((c, i) => {
      const load =
        i === outgoing.length - 1 ? remaining : (total * c.areaMm2) / area;
      remaining -= load;
      if (c.lowerId === "floor") {
        floorLoadG += load;
        return;
      }
      if (!degree.has(c.lowerId)) return;
      topLoadG[c.lowerId] += load;
      degree.set(c.lowerId, degree.get(c.lowerId)! - 1);
      if (degree.get(c.lowerId) === 0) queue.push(c.lowerId);
    });
  }
  if (processed !== ids.length)
    issues.push(issue("support-cycle", [], "Цикл в графе опор"));
  return { topLoadG, floorLoadG, issues };
}
