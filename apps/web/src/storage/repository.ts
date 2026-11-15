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
};
export async function saveProject(
  input: ProjectInput,
  solution: Solution | null,
  playback: PlaybackState | null,
): Promise<void> {
  const stale = !!solution && solution.inputRevisionId !== input.revisionId;
  const bytes = encodeProject(input, solution);
  await db.transaction("rw", db.projects, () =>
    db.projects.put({
      id: "active",
      version: 1,
      bytes,
      playback: playback ? playbackSchema.parse(playback) : null,
      stale,
      updatedAt: Date.now(),
    }),
  );
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
  const { input, solution } = decodeProject(stored.bytes);
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
  return { input, solution, playback, stale: stored.stale };
}
