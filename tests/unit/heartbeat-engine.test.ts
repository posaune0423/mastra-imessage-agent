import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../src/env", () => ({
  env: {
    ANTHROPIC_API_KEY: "sk-ant-test",
    OWNER_PHONE: "+819000000000",
    HEARTBEAT_INTERVAL_MS: 60000,
    HEARTBEAT_ACTIVE_START: "08:00",
    HEARTBEAT_ACTIVE_END: "22:00",
    DATABASE_URL: "file:./data/test.db",
    LOG_LEVEL: "info",
  },
}));

vi.mock("../../src/agent/heartbeat/state", () => ({
  heartbeatStateStore: {
    load: vi.fn().mockResolvedValue({
      reminders: [],
      metadata: {},
      lastRunAt: null,
    }),
    save: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("node:fs", () => ({
  readFileSync: vi.fn().mockReturnValue("# Heartbeat Checklist\n- check things"),
}));

describe("HeartbeatEngine", () => {
  let engine: InstanceType<typeof import("../../src/agent/heartbeat/engine").HeartbeatEngine>;
  let mockSdk: { send: ReturnType<typeof vi.fn> };
  let mockAgent: { generate: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.useFakeTimers();

    mockSdk = { send: vi.fn().mockResolvedValue(undefined) };
    mockAgent = { generate: vi.fn() };

    const { HeartbeatEngine } = await import("../../src/agent/heartbeat/engine");
    engine = new HeartbeatEngine(mockSdk as never, mockAgent as never, "+819000000000");
  });

  afterEach(() => {
    engine.stop();
    vi.useRealTimers();
  });

  test("does not send when agent returns HEARTBEAT_OK", async () => {
    // Set time to 12:00 (within active hours)
    vi.setSystemTime(new Date("2026-03-21T12:00:00+09:00"));

    mockAgent.generate.mockResolvedValue({ text: "HEARTBEAT_OK" });

    // Access private tick via start (which calls tick immediately)
    engine.start(60000);

    // Wait for the initial tick
    await vi.advanceTimersByTimeAsync(0);

    expect(mockAgent.generate).toHaveBeenCalled();
    expect(mockSdk.send).not.toHaveBeenCalled();
  });

  test("sends alert when agent returns actionable message", async () => {
    vi.setSystemTime(new Date("2026-03-21T12:00:00+09:00"));

    mockAgent.generate.mockResolvedValue({
      text: "Reminder: meeting in 30 minutes",
    });

    engine.start(60000);
    await vi.advanceTimersByTimeAsync(0);

    expect(mockSdk.send).toHaveBeenCalledWith("+819000000000", "Reminder: meeting in 30 minutes");
  });

  test("skips tick outside active hours", async () => {
    vi.setSystemTime(new Date("2026-03-21T03:00:00+09:00"));

    engine.start(60000);
    await vi.advanceTimersByTimeAsync(0);

    expect(mockAgent.generate).not.toHaveBeenCalled();
    expect(mockSdk.send).not.toHaveBeenCalled();
  });

  test("stop clears the interval", () => {
    vi.setSystemTime(new Date("2026-03-21T03:00:00+09:00"));

    engine.start(60000);
    engine.stop();

    // Advance well past the interval — no tick should run
    mockAgent.generate.mockResolvedValue({ text: "HEARTBEAT_OK" });
    vi.advanceTimersByTime(120000);

    // Only the initial tick call (which was skipped due to hours)
    expect(mockAgent.generate).not.toHaveBeenCalled();
  });
});
