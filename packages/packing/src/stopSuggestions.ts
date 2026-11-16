import type { ProjectInput } from "@vlezet/domain";
import { validatePlan } from "@vlezet/validation";
import { search } from "./search";
import type { SearchOptions, Solution } from "./types";

export type StopSuggestion = { stopOrder: number[]; solution: Solution };
const stopsOf = (input: ProjectInput) =>
  [...new Set(input.cargoTypes.map((c) => c.stop))].sort((a, b) => a - b);

/** Reorder entire delivery groups, retaining the original set of priority numbers. */
export function reorderStops(
  input: ProjectInput,
  order: number[],
): ProjectInput {
  const stops = stopsOf(input);
  if (
    order.length !== stops.length ||
    new Set(order).size !== stops.length ||
    order.some((s) => !stops.includes(s))
  )
    throw new Error("Порядок должен содержать каждую остановку ровно один раз");
  const priority = new Map(order.map((stop, i) => [stop, stops[i]]));
  return {
    ...input,
    cargoTypes: input.cargoTypes.map((c) => ({
      ...c,
      stop: priority.get(c.stop)!,
    })),
  };
}

export async function suggestStopOrder(
  input: ProjectInput,
  baseline: Solution,
  options: SearchOptions,
): Promise<StopSuggestion | null> {
  const stops = stopsOf(input);
  if (
    stops.length < 2 ||
    baseline.placements.length === input.instances.length ||
    options.signal.aborted
  )
    return null;
  // These whole-load bounds cannot be repaired by changing delivery order.
  const cargoMass = input.cargoTypes.reduce(
    (sum, c) => sum + c.massG * c.quantity,
    0,
  );
  const cargoVolume = input.cargoTypes.reduce(
    (sum, c) => sum + c.lengthMm * c.widthMm * c.heightMm * c.quantity,
    0,
  );
  if (
    cargoMass > input.vehicle.payloadG ||
    cargoVolume >
      input.vehicle.lengthMm * input.vehicle.widthMm * input.vehicle.heightMm
  )
    return null;
  const started = performance.now();
  const candidates: number[][] = [];
  const seen = new Set([stops.join(",")]);
  const add = (order: number[]) => {
    const key = order.join(",");
    if (!seen.has(key)) {
      seen.add(key);
      candidates.push(order);
    }
  };
  add([...stops].reverse());
  // Unload fragile/light groups before the groups capable of supporting them.
  const topLimit = (stop: number) =>
    Math.min(
      ...input.cargoTypes
        .filter((c) => c.stop === stop)
        .map((c) => c.maxTopLoadG ?? Number.MAX_SAFE_INTEGER),
    );
  add([...stops].sort((a, b) => topLimit(a) - topLimit(b) || a - b));
  if (stops.length <= 4) {
    const permute = (prefix: number[], rest: number[]) => {
      if (!rest.length) {
        add(prefix);
        return;
      }
      for (const stop of rest)
        permute(
          [...prefix, stop],
          rest.filter((s) => s !== stop),
        );
    };
    permute([], stops);
  } else {
    for (let i = 0; i < stops.length - 1; i++) {
      const order = [...stops];
      [order[i], order[i + 1]] = [order[i + 1], order[i]];
      add(order);
    }
    for (let i = 1; i < stops.length && candidates.length < 24; i++)
      add([...stops.slice(i), ...stops.slice(0, i)]);
  }
  for (const stopOrder of candidates.slice(0, 24)) {
    const remaining = options.deadlineMs - (performance.now() - started);
    if (remaining <= 0 || options.signal.aborted) break;
    const reordered = reorderStops(input, stopOrder);
    const solution = await search(
      reordered,
      {
        ...options,
        deadlineMs: Math.min(remaining, 500),
        maxAttempts: Math.min(options.maxAttempts, 16),
      },
      () => {},
    );
    if (options.signal.aborted) return null;
    if (
      solution.placements.length === input.instances.length &&
      validatePlan(reordered, solution.placements).valid
    )
      return { stopOrder, solution };
  }
  return null;
}
