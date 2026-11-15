import type { Solution } from "@vlezet/packing";
import type { Vec3Mm } from "@vlezet/domain";
export type PlaybackState = {
  solutionRevisionId: string;
  mode: "load" | "unload";
  stepIndex: number;
  completedIds: string[];
  paused: boolean;
  speed: number;
};
export function solutionRevision(s: Solution): string {
  let hash = 2166136261;
  for (const c of JSON.stringify(s.placements)) {
    hash ^= c.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `${s.inputRevisionId}:${hash >>> 0}`;
}
export function freshPlayback(
  s: Solution,
  mode: "load" | "unload" = "load",
): PlaybackState {
  return {
    solutionRevisionId: solutionRevision(s),
    mode,
    stepIndex: 0,
    completedIds: [],
    paused: true,
    speed: 1,
  };
}
export function getStepScene(
  s: Solution,
  state: PlaybackState,
  t: number,
): { staticIds: string[]; movingId: string | null; position: Vec3Mm | null } {
  if (
    s.status !== "ready" ||
    !s.report?.valid ||
    state.solutionRevisionId !== solutionRevision(s)
  )
    throw new Error("Инструкция требует текущий проверенный план");
  const steps =
    state.mode === "load" ? s.report.loadSteps : s.report.unloadSteps;
  const index = Math.max(
    0,
    Math.min(steps.length, Math.trunc(state.stepIndex)),
  );
  const step = steps[index];
  const staticIds =
    state.mode === "load"
      ? steps.slice(0, index).map((s) => s.instanceId)
      : steps.slice(index + 1).map((s) => s.instanceId);
  if (!step)
    return {
      staticIds: state.mode === "load" ? steps.map((s) => s.instanceId) : [],
      movingId: null,
      position: null,
    };
  const k = Math.max(0, Math.min(1, t));
  const position = {
    x: step.from.x + (step.to.x - step.from.x) * k,
    y: step.from.y + (step.to.y - step.from.y) * k,
    z: step.from.z + (step.to.z - step.from.z) * k,
  };
  return { staticIds, movingId: step.instanceId, position };
}
