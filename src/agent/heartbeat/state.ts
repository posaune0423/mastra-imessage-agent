import { randomUUID } from "node:crypto";
import { z } from "zod";
import { env } from "../../env";

const reminderSchema = z.object({
  id: z.string(),
  text: z.string(),
  dueAt: z.string(),
  createdAt: z.string(),
});

const heartbeatStateSchema = z.object({
  reminders: z.array(reminderSchema),
  metadata: z.record(z.string(), z.unknown()),
  lastRunAt: z.union([z.string(), z.null()]),
});

export type Reminder = z.infer<typeof reminderSchema>;
export type HeartbeatState = z.infer<typeof heartbeatStateSchema>;

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

    return heartbeatStateSchema.parse(JSON.parse(row.value));
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
