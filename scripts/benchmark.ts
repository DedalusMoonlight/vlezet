import { readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import { search } from "@vlezet/packing";
import { validatePlan } from "@vlezet/validation";
import type { ProjectInput } from "@vlezet/domain";
export async function benchmark(
  input: ProjectInput,
  seed: number,
  budgetMs: number,
) {
  const start = performance.now();
  let first: number | null = null;
  const result = await search(
    input,
    {
      seed,
      maxAttempts: 100,
      deadlineMs: budgetMs,
      signal: new AbortController().signal,
    },
    (e) => {
      if (e.kind === "best" && e.solution.status === "ready" && first === null)
        first = performance.now() - start;
    },
  );
  const valid =
    result.status === "ready" && validatePlan(input, result.placements).valid;
  if (valid && first === null) first = performance.now() - start;
  return {
    timeToFirstValidMs: first,
    elapsedMs: performance.now() - start,
    attempts: result.run.attempts,
    placedCount: result.placements.length,
    valid,
  };
}
const manifest = JSON.parse(
  readFileSync("fixtures/benchmarks/manifest.json", "utf8"),
);
const rows = [];
for (const item of manifest.cases) {
  const fixture = JSON.parse(
    readFileSync(`fixtures/benchmarks/${item.file}`, "utf8"),
  );
  const row = {
    id: item.id,
    kind: item.kind,
    ...(await benchmark(fixture.input, 42, 5000)),
  };
  rows.push(row);
  console.log(JSON.stringify(row));
  writeFileSync(
    ".cache/benchmark.json",
    JSON.stringify(
      {
        platform: os.platform(),
        arch: os.arch(),
        cpu: os.cpus()[0]?.model,
        node: process.version,
        budgetMs: 5000,
        seed: 42,
        rows,
      },
      null,
      2,
    ),
  );
}
console.log(
  `Ready within 5 s: ${rows.filter((r) => r.timeToFirstValidMs !== null && r.timeToFirstValidMs <= 5000).length}/20`,
);
