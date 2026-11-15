import { nativeApp } from "../../platform/runtime";
import { parseProject } from "@vlezet/domain";
import { restoreSolution } from "@vlezet/io";
import type { Solution } from "@vlezet/packing";
import type { ProjectInput } from "@vlezet/domain";
export type SharedSnapshot = {
  schemaVersion: 1;
  input: ProjectInput;
  solution: Solution;
};
async function request(path: string, init?: RequestInit) {
  if (nativeApp())
    throw new Error(
      "Сервис ссылок пока не подключён. Используйте обмен JSON-файлом.",
    );
  const r = await fetch(path, { ...init, signal: AbortSignal.timeout(15000) });
  if (!r.ok) {
    let error = "Сервис снимков недоступен";
    try {
      error = (await r.json()).error ?? error;
    } catch {}
    throw new Error(error);
  }
  return r;
}
export async function publishSnapshot(
  input: ProjectInput,
  solution: Solution,
): Promise<{ token: string; deleteSecret: string; expiresAt: number }> {
  const r = await request("/api/snapshots", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ schemaVersion: 1, input, solution }),
  });
  return r.json();
}
export async function readSnapshot(token: string): Promise<SharedSnapshot> {
  if (!/^[\w-]{32}$/.test(token)) throw new Error("Неверная ссылка");
  const r = await request(`/api/snapshots/${token}`);
  const text = await r.text();
  if (new TextEncoder().encode(text).length > 1024 * 1024)
    throw new Error("Слишком большой снимок");
  const data = JSON.parse(text);
  if (data.schemaVersion !== 1) throw new Error("Неизвестная версия снимка");
  const input = parseProject(data.input),
    solution = restoreSolution(input, data.solution);
  if (!solution || solution.status !== "ready" || !solution.report?.valid)
    throw new Error("Снимок не прошёл проверку");
  return { schemaVersion: 1, input, solution };
}
export async function deleteSnapshot(token: string, secret: string) {
  await request(`/api/snapshots/${token}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${secret}` },
  });
}
