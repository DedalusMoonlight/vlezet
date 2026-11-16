import { z } from "zod";
import type { ProjectInput } from "@vlezet/domain";
import type { Solution } from "@vlezet/packing";
import { encodeProject, decodeProject } from "@vlezet/io";
import {
  solutionRevision,
  type PlaybackState,
} from "../features/instructions/playback";
import { db, type StoredProject } from "./db";
const playbackSchema = z.object({
  solutionRevisionId: z.string(),
  mode: z.enum(["load", "unload"]),
  stepIndex: z.number().int().min(0).max(300),
  completedIds: z.array(z.string()).max(300),
  paused: z.boolean(),
  speed: z.union([z.literal(0.5), z.literal(1), z.literal(2)]),
});
export type SavedProject = {
  input: ProjectInput;
  solution: Solution | null;
  playback: PlaybackState | null;
  stale: boolean;
  cancelled: boolean;
};
export type ProjectSnapshot = Pick<
  SavedProject,
  "input" | "solution" | "playback" | "cancelled"
>;
function storedProject(
  id: string,
  { input, solution, playback, cancelled }: ProjectSnapshot,
): StoredProject {
  return {
    id,
    version: 1,
    bytes: encodeProject(input, solution, { cancelled }),
    playback: playback ? playbackSchema.parse(playback) : null,
    stale: !!solution && solution.inputRevisionId !== input.revisionId,
    updatedAt: Date.now(),
  };
}
export async function saveProjectSwap(
  active: ProjectSnapshot,
  previous: ProjectSnapshot,
): Promise<void> {
  const records = [
    storedProject("previous", previous),
    storedProject("active", active),
  ];
  await db.transaction("rw", db.projects, () => db.projects.bulkPut(records));
}
export async function saveProject(
  input: ProjectInput,
  solution: Solution | null,
  playback: PlaybackState | null,
  cancelled = false,
  id = "active",
): Promise<void> {
  const record = storedProject(id, { input, solution, playback, cancelled });
  await db.transaction("rw", db.projects, () => db.projects.put(record));
}
export function migrateStored(raw: unknown): StoredProject {
  const r = z
    .object({ id: z.string(), version: z.number() })
    .passthrough()
    .parse(raw);
  if (r.version === 1) return r as StoredProject;
  if (r.version === 0) {
    const old = z
      .object({
        id: z.string(),
        version: z.literal(0),
        project: z.object({ input: z.unknown(), solution: z.unknown() }),
      })
      .parse(raw);
    const decoded = decodeProject(
      new TextEncoder().encode(
        JSON.stringify({ format: "vlezet", schemaVersion: 1, ...old.project }),
      ),
    );
    return {
      id: r.id,
      version: 1,
      bytes: encodeProject(decoded.input, decoded.solution),
      playback: null,
      stale: false,
      updatedAt: Date.now(),
    };
  }
  throw new Error("Более новая версия сохранённого проекта");
}
export async function loadProject(id: string): Promise<SavedProject | null> {
  const raw = await db.projects.get(id);
  if (!raw) return null;
  const stored = migrateStored(raw);
  const { input, solution, cancelled } = decodeProject(stored.bytes);
  const parsed = playbackSchema.safeParse(stored.playback);
  const playback =
    solution &&
    parsed.success &&
    parsed.data.solutionRevisionId === solutionRevision(solution) &&
    parsed.data.stepIndex <= solution.placements.length
      ? {
          ...parsed.data,
          paused: true,
          completedIds: parsed.data.completedIds.filter((id) =>
            solution.placements.some((p) => p.instanceId === id),
          ),
        }
      : null;
  return { input, solution, playback, stale: stored.stale, cancelled };
}
