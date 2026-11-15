import { expect, it } from "vitest";
import { makeProject } from "../../../../../fixtures/builders";
import { createState, projectReducer } from "./reducer";
it("discards stale worker results and old cancellations", () => {
  const input = makeProject();
  let s = createState(input);
  s = projectReducer(s, { kind: "start", jobId: "A" });
  s = projectReducer(s, {
    kind: "input",
    input: { ...input, revisionId: "B" },
  });
  s = projectReducer(s, { kind: "start", jobId: "B" });
  const before = s;
  s = projectReducer(s, {
    kind: "message",
    message: {
      kind: "done",
      jobId: "A",
      inputRevisionId: "r1",
      solution: { status: "ready" } as never,
    },
  });
  expect(s).toBe(before);
  s = projectReducer(s, {
    kind: "message",
    message: { kind: "cancelled", jobId: "A", inputRevisionId: "r1" },
  });
  expect(s.activeJobId).toBe("B");
});
it("preserves inputs on failure and invalidates old solutions on edit", () => {
  const input = makeProject();
  let s = createState(input);
  s = projectReducer(s, { kind: "start", jobId: "A" });
  s = projectReducer(s, {
    kind: "message",
    message: {
      kind: "error",
      jobId: "A",
      inputRevisionId: input.revisionId,
      error: "Ошибка",
    },
  });
  expect(s.input).toEqual(input);
  expect(s.status).toBe("error");
  expect(s.error).toBe("Ошибка");
});
