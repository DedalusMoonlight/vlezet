import { randomId } from "@vlezet/domain";
import { create } from "zustand";
import {
  parseProject,
  type ProjectInput,
} from "../../../../../packages/domain/src";
import {
  reorderStops,
  type Solution,
} from "../../../../../packages/packing/src";
import { createState, projectReducer, type ProjectState } from "./reducer";
import { restoreSolution } from "@vlezet/io";
import { demoProject } from "./demo";
import type { WorkerResponse } from "../../workers/protocol";
let worker: Worker | null = null;
type Store = ProjectState & {
  setInput: (input: ProjectInput) => void;
  setSolution: (solution: Solution) => void;
  restore: (
    input: ProjectInput,
    solution: Solution | null,
    cancelled?: boolean,
  ) => void;
};
export const useProject = create<Store>((set) => ({
  ...createState(demoProject()),
  setInput: (input) => {
    worker?.terminate();
    worker = null;
    set((s) =>
      projectReducer(s, {
        kind: "input",
        input: parseProject({ ...input, revisionId: randomId() }),
      }),
    );
  },
  setSolution: (solution) =>
    set((s) => projectReducer(s, { kind: "solution", solution })),
  restore: (input, solution, cancelled = false) => {
    worker?.terminate();
    worker = null;
    set({
      ...createState(parseProject(input)),
      currentSolution: solution,
      status: cancelled ? "cancelled" : solution ? "done" : "idle",
    });
  },
}));
export function startCalculation(input: ProjectInput, budgetMs = 5000): void {
  worker?.terminate();
  worker = new Worker(
    new URL("../../workers/packing.worker.ts", import.meta.url),
    { type: "module" },
  );
  const jobId = randomId();
  const seed = (useProject.getState().currentSolution?.run.seed ?? 41) + 1;
  useProject.setState((s) => projectReducer(s, { kind: "start", jobId }));
  worker.onmessage = (e: MessageEvent<WorkerResponse>) =>
    useProject.setState((s) =>
      projectReducer(s, { kind: "message", message: e.data }),
    );
  worker.onerror = () =>
    useProject.setState((s) =>
      projectReducer(s, {
        kind: "message",
        message: {
          kind: "error",
          jobId,
          inputRevisionId: input.revisionId,
          error: "Расчёт прерван. Данные проекта сохранены в памяти.",
        },
      }),
    );
  worker.postMessage({ kind: "solve", jobId, input, seed, budgetMs });
}
export function cancelCalculation(): void {
  const s = useProject.getState();
  if (!s.activeJobId) return;
  const current = worker;
  const jobId = s.activeJobId;
  worker?.postMessage({ kind: "cancel", jobId });
  setTimeout(() => {
    if (useProject.getState().activeJobId === jobId) {
      current?.terminate();
      useProject.setState((s) =>
        projectReducer(s, {
          kind: "message",
          message: {
            kind: "cancelled",
            jobId,
            inputRevisionId: s.input.revisionId,
          },
        }),
      );
    }
  }, 500);
}

export function applyStopSuggestion(): void {
  const state = useProject.getState();
  const suggestion = state.stopSuggestion;
  if (
    !suggestion ||
    state.status === "running" ||
    suggestion.solution.inputRevisionId !== state.input.revisionId
  )
    return;
  const input = parseProject({
    ...reorderStops(state.input, suggestion.stopOrder),
    revisionId: randomId(),
  });
  const solution = restoreSolution(input, {
    ...suggestion.solution,
    inputRevisionId: input.revisionId,
  });
  if (
    !solution?.report?.valid ||
    solution.placements.length !== input.instances.length
  )
    return;
  state.restore(input, solution);
}
