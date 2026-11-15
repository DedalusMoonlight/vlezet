import {
  parseProject,
  type ProjectInput,
  type Placement,
} from "../../domain/src";
import {
  enumerateOrientations,
  orientedDimensions,
  geometryIssues,
  validateLayout,
  validatePlan,
  issue,
  type ValidationIssue,
} from "../../validation/src";
import { shelfLayout } from "./shelves";
import { candidates } from "./candidates";
import { orderedInstances } from "./orders";
import { volume, score, better } from "./score";
import type { Solution, SearchEvent, SearchOptions } from "./types";
export async function search(
  raw: ProjectInput,
  options: SearchOptions,
  emit: (event: SearchEvent) => void,
): Promise<Solution> {
  const input = parseProject(raw),
    start = performance.now(),
    types = new Map(input.cargoTypes.map((t) => [t.id, t]));
  let attempts = 0;
  const makeSolution = (
    placements: Placement[],
    forced?: Solution["status"],
    issues: ValidationIssue[] = [],
  ): Solution => {
    const ids = new Set(placements.map((p) => p.instanceId));
    const missing = input.instances.filter((i) => !ids.has(i.id));
    const hasRequired = missing.some((i) => types.get(i.typeId)!.required);
    const report = validatePlan(input, placements, {
      requireAllRequired: false,
    });
    return {
      inputRevisionId: input.revisionId,
      placements: structuredClone(placements),
      unplacedIds: missing.map((i) => i.id),
      status:
        forced ??
        (hasRequired ? (placements.length ? "partial" : "not-found") : "ready"),
      issues: [...issues, ...report.issues],
      report,
      metrics: {
        placedCount: placements.length,
        placedVolumeMm3: placements.reduce(
          (s, p) =>
            s +
            volume(
              types.get(
                input.instances.find((i) => i.id === p.instanceId)!.typeId,
              )!,
            ),
          0,
        ),
        totalMassG: placements.reduce(
          (s, p) =>
            s +
            types.get(
              input.instances.find((i) => i.id === p.instanceId)!.typeId,
            )!.massG,
          0,
        ),
      },
      run: {
        seed: options.seed,
        algorithmVersion: "shelves-ep-support-v2",
        attempts,
      },
    };
  };
  let best = makeSolution([], "not-found");
  let bestScore = score(input, []);
  const proof: ValidationIssue[] = [];
  const m = input.settings.wallGapMm;
  const usable = [
    input.vehicle.lengthMm - 2 * m,
    input.vehicle.widthMm - 2 * m,
    input.vehicle.heightMm - m,
  ];
  for (const t of input.cargoTypes.filter((t) => t.required))
    if (
      !enumerateOrientations(t).some((o) =>
        orientedDimensions(t, o).every((d, i) => d <= usable[i]),
      )
    )
      proof.push(
        issue(
          "oversize",
          input.instances.filter((i) => i.typeId === t.id).map((i) => i.id),
          "Обязательная коробка не помещается ни в одном разрешённом положении",
        ),
      );
  if (
    input.cargoTypes
      .filter((t) => t.required)
      .reduce((s, t) => s + t.massG * t.quantity, 0) > input.vehicle.payloadG
  )
    proof.push(
      issue(
        "required-weight",
        [],
        "Масса обязательных грузов превышает грузоподъёмность",
      ),
    );
  if (
    input.cargoTypes
      .filter((t) => t.required)
      .reduce((s, t) => s + volume(t) * t.quantity, 0) >
    Math.max(0, usable[0]) * Math.max(0, usable[1]) * Math.max(0, usable[2])
  )
    proof.push(
      issue(
        "required-volume",
        [],
        "Объём обязательных грузов превышает полезный объём",
      ),
    );
  if (proof.length) return makeSolution([], "proven-infeasible", proof);
  const stopped = () =>
    options.signal.aborted || performance.now() - start >= options.deadlineMs;
  // Validate the constructive seed independently, just like every published result.
  for (const yaw of [0, 1] as const) {
    if (stopped() || options.maxAttempts === 0) break;
    const shelves = shelfLayout(input, yaw);
    if (shelves) {
      const candidate = makeSolution(shelves);
      if (candidate.report?.valid && candidate.status === "ready") {
        candidate.run.attempts = 1;
        emit({ kind: "best", solution: candidate });
        return candidate;
      }
    }
  }
  let checks = 0;
  for (
    let attempt = 0;
    attempt < options.maxAttempts && !stopped();
    attempt++
  ) {
    attempts++;
    let placed: Placement[] = [];
    // Periodic local repacking preserves most of the best solution and retries a small subset.
    const order = orderedInstances(input, attempt, options.seed);
    if (attempt > 3 && attempt % 3 === 0 && best.placements.length) {
      const remove = new Set(
        order.slice(0, Math.min(5, order.length)).map((i) => i.id),
      );
      const candidate = best.placements.filter(
        (p) => !remove.has(p.instanceId),
      );
      if (validateLayout(input, candidate).valid)
        placed = structuredClone(candidate);
    }
    for (const instance of order) {
      if (stopped()) break;
      if (placed.some((p) => p.instanceId === instance.id)) continue;
      const t = types.get(instance.typeId)!;
      const orientations = enumerateOrientations(t);
      const unique = new Set<string>();
      let chosen: Placement | null = null;
      for (const o of orientations) {
        const dims = orientedDimensions(t, o),
          key = dims.join(":");
        if (unique.has(key)) continue;
        unique.add(key);
        for (const position of candidates(input, placed, dims)) {
          if (++checks % 128 === 0) {
            await new Promise<void>((r) => setTimeout(r, 0));
            if (stopped()) break;
          }
          const p: Placement = {
            instanceId: instance.id,
            position,
            orientation: o,
          };
          if (
            geometryIssues(input, [p]).length ||
            placed.some((q) => geometryIssues(input, [q, p]).length)
          )
            continue;
          if (validateLayout(input, [...placed, p]).valid) {
            chosen = p;
            break;
          }
        }
        if (chosen || stopped()) break;
      }
      if (chosen) placed.push(chosen);
    }
    const currentScore = score(input, placed);
    if (
      better(currentScore, bestScore) ||
      (best.status === "not-found" &&
        placed.length === 0 &&
        !input.cargoTypes.some((t) => t.required))
    ) {
      const candidate = makeSolution(placed);
      if (candidate.report?.valid) {
        best = candidate;
        bestScore = currentScore;
        emit({ kind: "best", solution: best });
      }
    }
    emit({ kind: "progress", attempts });
    await new Promise<void>((r) => setTimeout(r, 0));
    if (best.placements.length === input.instances.length) break;
  }
  best.run.attempts = attempts;
  return best;
}
