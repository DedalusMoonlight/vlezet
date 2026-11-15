import type { Vec3Mm } from "../../domain/src";
export type ValidationIssue = {
  code: string;
  instanceIds: string[];
  message: string;
};
export type Box = { min: Vec3Mm; max: Vec3Mm };
export type Rect = { x0: number; y0: number; x1: number; y1: number };
export const issue = (
  code: string,
  instanceIds: string[],
  message: string,
): ValidationIssue => ({ code, instanceIds, message });
