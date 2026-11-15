import Database from "better-sqlite3";
export type SnapshotRow = {
  token: string;
  secret_hash: string;
  body: string;
  expires_at: number;
};
export class SnapshotRepository {
  db: Database.Database;
  constructor(filename: string) {
    this.db = new Database(filename);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(
      "CREATE TABLE IF NOT EXISTS snapshots (token TEXT PRIMARY KEY, secret_hash TEXT NOT NULL, body TEXT NOT NULL, expires_at INTEGER NOT NULL); CREATE INDEX IF NOT EXISTS snapshots_expiry ON snapshots(expires_at);",
    );
  }
  insert(row: SnapshotRow) {
    this.db
      .prepare(
        "INSERT INTO snapshots VALUES (@token,@secret_hash,@body,@expires_at)",
      )
      .run(row);
  }
  get(token: string) {
    return this.db
      .prepare("SELECT * FROM snapshots WHERE token=?")
      .get(token) as SnapshotRow | undefined;
  }
  delete(token: string) {
    this.db.prepare("DELETE FROM snapshots WHERE token=?").run(token);
  }
  expire(now: number) {
    this.db.prepare("DELETE FROM snapshots WHERE expires_at<=?").run(now);
  }
  close() {
    this.db.close();
  }
}
