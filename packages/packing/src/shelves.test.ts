import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseProject } from "@vlezet/domain";
import { validatePlan } from "@vlezet/validation";
import { shelfLayout } from "./shelves";
it("constructs complete stop-ordered layers for three dense known-solvable cases", () => {
  for (const file of ["01", "09", "17"]) {
    const { input: raw } = JSON.parse(
      readFileSync(`fixtures/benchmarks/cases/${file}.json`, "utf8"),
    );
    const input = parseProject(raw),
      placements = shelfLayout(input);
    expect(placements?.length).toBe(100);
    if (!placements) throw new Error(`No shelf seed for fixture ${file}`);
    expect(validatePlan(input, placements).valid).toBe(true);
  }
});
