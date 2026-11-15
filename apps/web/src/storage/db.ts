import Dexie, { type Table } from "dexie";
export type StoredProject = {
  id: string;
  version: 1;
  bytes: Uint8Array;
  playback: unknown;
  stale: boolean;
  updatedAt: number;
};
export class ProjectDB extends Dexie {
  projects!: Table<StoredProject, string>;
  secrets!: Table<{ token: string; secret: string; expiresAt: number }, string>;
  constructor(name = "vlezet") {
    super(name);
    this.version(1).stores({ projects: "id", secrets: "token" });
  }
}
export const db = new ProjectDB();
