import type { ProjectInput } from "../../../../../packages/domain/src";
import type { Solution } from "../../../../../packages/packing/src";
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
    };
  if (a.kind === "solution")
    return {
      ...s,
      currentSolution: a.solution,
      status: "done",
      activeJobId: null,
    };
  if (a.kind === "start")
    return {
      ...s,
      activeJobId: a.jobId,
      status: "running",
      error: null,
      attempts: 0,
    };
  const m = a.message;
  if (m.jobId !== s.activeJobId || m.inputRevisionId !== s.input.revisionId)
    return s;
  if (m.kind === "progress") return { ...s, attempts: m.attempts };
  if (m.kind === "error")
    return { ...s, status: "error", activeJobId: null, error: m.error };
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
    status:
      m.kind === "best"
        ? "running"
        : m.kind === "cancelled"
          ? "cancelled"
          : "done",
    activeJobId: m.kind === "best" ? s.activeJobId : null,
  };
}
