import type { Placement } from "../../domain/src";
import type { ValidationIssue, ValidationReport } from "../../validation/src";
export type Solution = {
  inputRevisionId: string;
  placements: Placement[];
  unplacedIds: string[];
  status: "ready" | "partial" | "proven-infeasible" | "not-found";
  issues: ValidationIssue[];
  report: ValidationReport | null;
  metrics: { placedVolumeMm3: number; totalMassG: number; placedCount: number };
  run: { seed: number; algorithmVersion: string; attempts: number };
};
export type SearchEvent =
  { kind: "best"; solution: Solution } | { kind: "progress"; attempts: number };
export type SearchOptions = {
  seed: number;
  maxAttempts: number;
  deadlineMs: number;
  signal: AbortSignal;
};
