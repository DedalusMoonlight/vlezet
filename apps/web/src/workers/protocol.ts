import type { ProjectInput } from "../../../../packages/domain/src";
import type { Solution } from "../../../../packages/packing/src";
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
    | { kind: "best" | "done"; solution: Solution }
    | { kind: "cancelled"; solution?: Solution }
    | { kind: "error"; error: string }
  );
