import { randomUUID } from "node:crypto";
import { env } from "../../env";

export interface Reminder {
  id: string;
  text: string;
  dueAt: string; // ISO 8601
  createdAt: string;
}

export interface HeartbeatState {
  reminders: Reminder[];
  metadata: Record<string, unknown>;
  lastRunAt: string | null;
}

const DB_PATH = env.DATABASE_URL;

export class HeartbeatStateStore {
  async init(): Promise<void> {
    const dbPath = DB_PATH.replace("file:", "");
    const { Database } = await import("bun:sqlite");
    const db = new Database(dbPath);
    db.run(`
      CREATE TABLE IF NOT EXISTS heartbeat_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);
    db.close();
  }

  async load(): Promise<HeartbeatState> {
    const dbPath = DB_PATH.replace("file:", "");
    const { Database } = await import("bun:sqlite");
    const db = new Database(dbPath);

    const row = db.query<{ value: string }, []>("SELECT value FROM heartbeat_state WHERE key = 'state'").get();

    db.close();

    if (!row) {
      return { reminders: [], metadata: {}, lastRunAt: null };
    }

    return JSON.parse(row.value) as HeartbeatState;
  }

  async save(state: HeartbeatState): Promise<void> {
    const dbPath = DB_PATH.replace("file:", "");
    const { Database } = await import("bun:sqlite");
    const db = new Database(dbPath);

    db.run(
      `INSERT OR REPLACE INTO heartbeat_state (key, value, updated_at)
       VALUES ('state', ?, datetime('now'))`,
      [JSON.stringify(state)],
    );

    db.close();
  }

  async addReminder(reminder: Omit<Reminder, "id" | "createdAt">): Promise<void> {
    const state = await this.load();
    state.reminders.push({
      ...reminder,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    });
    await this.save(state);
  }

  async removeReminder(id: string): Promise<void> {
    const state = await this.load();
    state.reminders = state.reminders.filter((r) => r.id !== id);
    await this.save(state);
  }
}

export const heartbeatStateStore = new HeartbeatStateStore();
