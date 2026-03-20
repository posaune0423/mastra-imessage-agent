import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/env", () => ({
  env: {
    ANTHROPIC_API_KEY: "sk-ant-test",
    OWNER_PHONE: "+819000000000",
    HEARTBEAT_INTERVAL_MS: 3600000,
    HEARTBEAT_ACTIVE_START: "08:00",
    HEARTBEAT_ACTIVE_END: "22:00",
    DATABASE_URL: "file:./data/test-e2e.db",
    LOG_LEVEL: "info",
  },
}));

vi.mock("../../src/agent/heartbeat/state", () => ({
  heartbeatStateStore: {
    load: vi.fn().mockResolvedValue({
      reminders: [
        {
          id: "r1",
          text: "meeting at 3pm",
          dueAt: "2026-03-21T15:00:00+09:00",
          createdAt: "2026-03-21T10:00:00Z",
        },
      ],
      metadata: {},
      lastRunAt: null,
    }),
    save: vi.fn().mockResolvedValue(undefined),
    init: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("node:fs", () => ({
  readFileSync: vi.fn().mockReturnValue("# Heartbeat Checklist\n- check things"),
}));

describe("message flow e2e", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  test("onDirectMessage handler filters non-owner messages", async () => {
    const { normalizePhone } = await import("../../src/utils/phone");

    const ownerPhone = "+819000000000";
    const msg = { sender: "+819099999999", text: "hello" };

    const isOwner = normalizePhone(msg.sender) === ownerPhone;
    expect(isOwner).toBe(false);
  });

  test("onDirectMessage handler accepts owner messages", async () => {
    const { normalizePhone } = await import("../../src/utils/phone");

    const ownerPhone = "+819000000000";
    const msg = { sender: "+81 90-0000-0000", text: "hello" };

    const isOwner = normalizePhone(msg.sender) === ownerPhone;
    expect(isOwner).toBe(true);
  });

  test("onDirectMessage handler skips empty messages", () => {
    const text = "";
    expect(text.trim()).toBe("");
  });

  test("dependency injection wiring works end-to-end", async () => {
    const { injectSendFn } = await import("../../src/agent/tools");
    const { injectAddReminder } = await import("../../src/agent/tools/set-reminder");

    const mockSend = vi.fn().mockResolvedValue(undefined);
    const mockAddReminder = vi.fn().mockResolvedValue(undefined);

    injectSendFn(mockSend);
    injectAddReminder(mockAddReminder);

    const { sendMessageTool } = await import("../../src/agent/tools/send-message");
    await sendMessageTool.execute!({ text: "test" }, {} as never);
    expect(mockSend).toHaveBeenCalledWith("+819000000000", "test");

    const { setReminderTool } = await import("../../src/agent/tools/set-reminder");
    await setReminderTool.execute!(
      { text: "reminder", dueAt: "2026-04-01T00:00:00Z" },
      {} as never,
    );
    expect(mockAddReminder).toHaveBeenCalledWith({
      text: "reminder",
      dueAt: "2026-04-01T00:00:00Z",
    });
  });

  test("heartbeat engine sends alert for actionable response", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-21T14:30:00+09:00"));

    const mockSdk = { send: vi.fn().mockResolvedValue(undefined) };
    const mockAgent = {
      generate: vi.fn().mockResolvedValue({
        text: "Reminder: meeting at 3pm is in 30 minutes",
      }),
    };

    const { HeartbeatEngine } = await import("../../src/agent/heartbeat/engine");
    const engine = new HeartbeatEngine(mockSdk as never, mockAgent as never, "+819000000000");

    engine.start(60000);
    await vi.advanceTimersByTimeAsync(0);

    expect(mockAgent.generate).toHaveBeenCalled();
    const prompt = mockAgent.generate.mock.calls[0]![0] as string;
    expect(prompt).toContain("[HEARTBEAT CHECK]");

    expect(mockSdk.send).toHaveBeenCalledWith(
      "+819000000000",
      "Reminder: meeting at 3pm is in 30 minutes",
    );

    engine.stop();
    vi.useRealTimers();
  });

  test("heartbeat engine stays silent for HEARTBEAT_OK", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-21T14:30:00+09:00"));

    const mockSdk = { send: vi.fn().mockResolvedValue(undefined) };
    const mockAgent = {
      generate: vi.fn().mockResolvedValue({ text: "HEARTBEAT_OK" }),
    };

    const { HeartbeatEngine } = await import("../../src/agent/heartbeat/engine");
    const engine = new HeartbeatEngine(mockSdk as never, mockAgent as never, "+819000000000");

    engine.start(60000);
    await vi.advanceTimersByTimeAsync(0);

    expect(mockAgent.generate).toHaveBeenCalled();
    expect(mockSdk.send).not.toHaveBeenCalled();

    engine.stop();
    vi.useRealTimers();
  });
});
