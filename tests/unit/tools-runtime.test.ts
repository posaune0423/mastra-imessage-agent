import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createAgentToolRuntime } from "../../src/agents/tools";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("createAgentToolRuntime", () => {
  it("persists scheduler and reminder state to disk", () => {
    const dir = mkdtempSync(join(tmpdir(), "tool-runtime-"));
    tempDirs.push(dir);
    const filePath = join(dir, "scheduler.json");
    const sdk = {
      send: vi.fn().mockResolvedValue({
        sentAt: new Date("2026-03-22T00:00:00.000Z"),
      }),
    } as never;

    const runtime = createAgentToolRuntime(sdk, filePath);
    runtime.scheduler.schedule({
      to: "+819012345678",
      content: "Follow up",
      sendAt: new Date("2026-03-22T01:00:00.000Z"),
      id: "scheduled-1",
    });
    runtime.reminders.exact(new Date("2026-03-22T02:00:00.000Z"), "+819012345678", "Wake up", { id: "reminder-1" });
    runtime.persist();
    runtime.destroy();

    const saved = JSON.parse(readFileSync(filePath, "utf8")) as {
      scheduled: {
        scheduled: Array<{ id: string }>;
      };
      reminders: Array<{ id: string }>;
    };

    expect(saved.scheduled.scheduled[0]?.id).toBe("scheduled-1");
    expect(saved.reminders[0]?.id).toBe("reminder-1");
  });
});
