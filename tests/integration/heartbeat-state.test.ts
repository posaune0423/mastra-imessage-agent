import { describe, test, expect, beforeEach, vi } from "vitest";
import type { HeartbeatStateStore } from "../../src/agent/heartbeat/state";

// Shared storage across MockDatabase instances (simulates file-based DB)
let sharedStore: Map<string, Record<string, unknown>>;

class MockDatabase {
  run(sql: string, params?: unknown[]) {
    if (sql.includes("CREATE TABLE IF NOT EXISTS")) {
      // init — no-op, store already exists
    } else if (sql.includes("INSERT OR REPLACE INTO heartbeat_state")) {
      const value = (params as string[])[0]!;
      sharedStore.set("state", { value });
    }
  }

  query<T>(_sql: string) {
    return {
      get: (): T | undefined => {
        const row = sharedStore.get("state");
        return row as T | undefined;
      },
    };
  }

  close() {}
}

vi.mock("../../src/env", () => ({
  env: {
    ANTHROPIC_API_KEY: "sk-ant-test",
    OWNER_PHONE: "+819000000000",
    HEARTBEAT_INTERVAL_MS: 3600000,
    HEARTBEAT_ACTIVE_START: "08:00",
    HEARTBEAT_ACTIVE_END: "22:00",
    DATABASE_URL: "file:./data/test-heartbeat.db",
    LOG_LEVEL: "info",
  },
}));

vi.mock("bun:sqlite", () => ({
  Database: MockDatabase,
}));

describe("HeartbeatStateStore", () => {
  let store: HeartbeatStateStore;

  beforeEach(async () => {
    // Reset shared store for each test
    sharedStore = new Map();

    vi.resetModules();
    const mod = await import("../../src/agent/heartbeat/state");
    store = new mod.HeartbeatStateStore();
    await store.init();
  });

  test("init creates the table and load returns default state", async () => {
    const state = await store.load();
    expect(state).toEqual({
      reminders: [],
      metadata: {},
      lastRunAt: null,
    });
  });

  test("save and load round-trip", async () => {
    const state = {
      reminders: [],
      metadata: { foo: "bar" },
      lastRunAt: "2026-03-21T10:00:00Z",
    };
    await store.save(state);

    const loaded = await store.load();
    expect(loaded).toEqual(state);
  });

  test("addReminder persists a reminder with generated id", async () => {
    await store.addReminder({
      text: "buy groceries",
      dueAt: "2026-03-22T09:00:00Z",
    });

    const state = await store.load();
    expect(state.reminders).toHaveLength(1);
    expect(state.reminders[0]!.text).toBe("buy groceries");
    expect(state.reminders[0]!.dueAt).toBe("2026-03-22T09:00:00Z");
    expect(state.reminders[0]!.id).toBeTruthy();
    expect(state.reminders[0]!.createdAt).toBeTruthy();
  });

  test("addReminder appends to existing reminders", async () => {
    await store.addReminder({
      text: "first",
      dueAt: "2026-03-22T09:00:00Z",
    });
    await store.addReminder({
      text: "second",
      dueAt: "2026-03-23T09:00:00Z",
    });

    const state = await store.load();
    expect(state.reminders).toHaveLength(2);
    expect(state.reminders[0]!.text).toBe("first");
    expect(state.reminders[1]!.text).toBe("second");
  });

  test("removeReminder deletes by id", async () => {
    await store.addReminder({
      text: "to remove",
      dueAt: "2026-03-22T09:00:00Z",
    });
    await store.addReminder({
      text: "to keep",
      dueAt: "2026-03-23T09:00:00Z",
    });

    const state = await store.load();
    const removeId = state.reminders[0]!.id;

    await store.removeReminder(removeId);

    const updated = await store.load();
    expect(updated.reminders).toHaveLength(1);
    expect(updated.reminders[0]!.text).toBe("to keep");
  });

  test("removeReminder with non-existent id is a no-op", async () => {
    await store.addReminder({
      text: "stay",
      dueAt: "2026-03-22T09:00:00Z",
    });

    await store.removeReminder("non-existent-id");

    const state = await store.load();
    expect(state.reminders).toHaveLength(1);
  });
});
