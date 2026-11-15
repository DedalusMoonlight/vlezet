import { create } from "zustand";
import {
  parseProject,
  type ProjectInput,
} from "../../../../../packages/domain/src";
import type { Solution } from "../../../../../packages/packing/src";
import { createState, projectReducer, type ProjectState } from "./reducer";
import { demoProject } from "./demo";
import type { WorkerResponse } from "../../workers/protocol";
let worker: Worker | null = null;
type Store = ProjectState & {
  setInput: (input: ProjectInput) => void;
  setSolution: (solution: Solution) => void;
  restore: (input: ProjectInput, solution: Solution | null) => void;
};
export const useProject = create<Store>((set) => ({
  ...createState(demoProject()),
  setInput: (input) => {
    worker?.terminate();
    worker = null;
    set((s) =>
      projectReducer(s, {
        kind: "input",
        input: parseProject({ ...input, revisionId: crypto.randomUUID() }),
      }),
    );
  },
  setSolution: (solution) =>
    set((s) => projectReducer(s, { kind: "solution", solution })),
  restore: (input, solution) => {
    worker?.terminate();
    worker = null;
    set({ ...createState(parseProject(input)), currentSolution: solution });
  },
}));
export function startCalculation(input: ProjectInput, budgetMs = 5000): void {
  worker?.terminate();
  worker = new Worker(
    new URL("../../workers/packing.worker.ts", import.meta.url),
    { type: "module" },
  );
  const jobId = crypto.randomUUID();
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
