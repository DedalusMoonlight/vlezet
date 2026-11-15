import { search } from "../../../../packages/packing/src";
import type { WorkerRequest, WorkerResponse } from "./protocol";
const jobs = new Map<string, AbortController>();
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const m = event.data;
  if (m.kind === "cancel") {
    jobs.get(m.jobId)?.abort();
    return;
  }
  const controller = new AbortController();
  jobs.set(m.jobId, controller);
  const identity = { jobId: m.jobId, inputRevisionId: m.input.revisionId };
  const send = (msg: WorkerResponse) => self.postMessage(msg);
  try {
    const solution = await search(
      m.input,
      {
        seed: m.seed,
        maxAttempts: 100,
        deadlineMs: m.budgetMs,
        signal: controller.signal,
      },
      (e) => send({ ...identity, ...e }),
    );
    send({
      ...identity,
      kind: controller.signal.aborted ? "cancelled" : "done",
      solution,
    });
  } catch (error) {
    send({
      ...identity,
      kind: "error",
      error:
        error instanceof Error ? error.message : "Не удалось выполнить расчёт",
    });
  } finally {
    jobs.delete(m.jobId);
  }
};
