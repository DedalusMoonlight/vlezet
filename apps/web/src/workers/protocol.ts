import type { ProjectInput } from "../../../../packages/domain/src";
import type {
  Solution,
  StopSuggestion,
} from "../../../../packages/packing/src";
export type WorkerRequest =
  | {
      kind: "solve";
      jobId: string;
      input: ProjectInput;
      seed: number;
      budgetMs: number;
    }
  | { kind: "cancel"; jobId: string };
type Identity = { jobId: string; inputRevisionId: string };
export type WorkerResponse = Identity &
  (
    | { kind: "progress"; attempts: number }
    | { kind: "best"; solution: Solution }
    | { kind: "checking-stops" }
    | { kind: "done"; solution: Solution; suggestion?: StopSuggestion | null }
    | { kind: "cancelled"; solution?: Solution }
    | { kind: "error"; error: string }
  );
