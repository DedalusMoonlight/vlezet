import type { ProjectInput } from "../../../../../packages/domain/src";
import type {
  Solution,
  StopSuggestion,
} from "../../../../../packages/packing/src";
import { score, better } from "../../../../../packages/packing/src/score";
import type { WorkerResponse } from "../../workers/protocol";
export type ProjectState = {
  input: ProjectInput;
  currentSolution: Solution | null;
  staleSolution: Solution | null;
  activeJobId: string | null;
  status: "idle" | "running" | "done" | "cancelled" | "error";
  error: string | null;
  attempts: number;
  stopSuggestion: StopSuggestion | null;
  checkingStops: boolean;
};
export type ProjectAction =
  | { kind: "input"; input: ProjectInput }
  | { kind: "start"; jobId: string }
  | { kind: "message"; message: WorkerResponse }
  | { kind: "solution"; solution: Solution };
export const createState = (input: ProjectInput): ProjectState => ({
  input,
  currentSolution: null,
  staleSolution: null,
  activeJobId: null,
  status: "idle",
  error: null,
  attempts: 0,
  stopSuggestion: null,
  checkingStops: false,
});
export function projectReducer(
  s: ProjectState,
  a: ProjectAction,
): ProjectState {
  if (a.kind === "input")
    return {
      ...s,
      input: a.input,
      staleSolution: s.currentSolution ?? s.staleSolution,
      currentSolution: null,
      activeJobId: null,
      status: "idle",
      error: null,
      stopSuggestion: null,
      checkingStops: false,
    };
  if (a.kind === "solution")
    return {
      ...s,
      currentSolution: a.solution,
      status: "done",
      stopSuggestion: null,
      checkingStops: false,
      activeJobId: null,
    };
  if (a.kind === "start")
    return {
      ...s,
      activeJobId: a.jobId,
      status: "running",
      error: null,
      attempts: 0,
      stopSuggestion: null,
      checkingStops: false,
    };
  const m = a.message;
  if (m.jobId !== s.activeJobId || m.inputRevisionId !== s.input.revisionId)
    return s;
  if (m.kind === "checking-stops") return { ...s, checkingStops: true };
  if (m.kind === "progress") return { ...s, attempts: m.attempts };
  if (m.kind === "error")
    return {
      ...s,
      status: "error",
      activeJobId: null,
      error: m.error,
      checkingStops: false,
    };
  let solution = s.currentSolution;
  if (
    m.solution &&
    (!solution ||
      better(
        score(s.input, m.solution.placements),
        score(s.input, solution.placements),
      ) ||
      m.solution.status === "proven-infeasible")
  )
    solution = m.solution;
  return {
    ...s,
    currentSolution: solution,
    stopSuggestion: m.kind === "done" ? (m.suggestion ?? null) : null,
    checkingStops: m.kind === "best" ? s.checkingStops : false,
    status:
      m.kind === "best"
        ? "running"
        : m.kind === "cancelled"
          ? "cancelled"
          : "done",
    activeJobId: m.kind === "best" ? s.activeJobId : null,
  };
}
