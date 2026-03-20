import { describe, test, expect, vi, beforeEach } from "vitest";

// Mock env before any tool imports
vi.mock("../../src/env", () => ({
  env: {
    ANTHROPIC_API_KEY: "sk-ant-test",
    OWNER_PHONE: "+819000000000",
    HEARTBEAT_INTERVAL_MS: 3600000,
    HEARTBEAT_ACTIVE_START: "08:00",
    HEARTBEAT_ACTIVE_END: "22:00",
    DATABASE_URL: "file:./data/test.db",
    LOG_LEVEL: "info",
  },
}));

describe("get-datetime tool", () => {
  test("returns datetime with default timezone (Asia/Tokyo)", async () => {
    const { getDateTimeTool } = await import("../../src/agent/tools/get-datetime");
    const result = (await getDateTimeTool.execute!({ timezone: undefined }, {} as never)) as {
      timezone: string;
      iso: string;
      readable: string;
      dayOfWeek: string;
    };
    expect(result).toHaveProperty("iso");
    expect(result).toHaveProperty("readable");
    expect(result).toHaveProperty("dayOfWeek");
    expect(result).toHaveProperty("timezone", "Asia/Tokyo");
    expect(result.iso).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.readable).toMatch(/^\d{4}\/\d{2}\/\d{2}/);
  });

  test("respects specified timezone", async () => {
    const { getDateTimeTool } = await import("../../src/agent/tools/get-datetime");
    const result = (await getDateTimeTool.execute!({ timezone: "America/New_York" }, {} as never)) as {
      timezone: string;
      iso: string;
      readable: string;
      dayOfWeek: string;
    };
    expect(result.timezone).toBe("America/New_York");
  });

  test("has correct tool metadata", async () => {
    const { getDateTimeTool } = await import("../../src/agent/tools/get-datetime");
    expect(getDateTimeTool.id).toBe("get-datetime");
    expect(getDateTimeTool.description).toBeTruthy();
  });
});

describe("send-message tool", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  test("throws if sendFn not injected", async () => {
    const { sendMessageTool } = await import("../../src/agent/tools/send-message");
    await expect(sendMessageTool.execute!({ text: "hello" }, {} as never)).rejects.toThrow("sendFn not injected");
  });

  test("calls injected sendFn with owner phone", async () => {
    const { sendMessageTool, injectSendFn } = await import("../../src/agent/tools/send-message");
    const mockSend = vi.fn().mockResolvedValue(undefined);
    injectSendFn(mockSend);

    const result = await sendMessageTool.execute!({ text: "hello" }, {} as never);

    expect(mockSend).toHaveBeenCalledWith("+819000000000", "hello");
    expect(result).toEqual({ success: true });
  });
});

describe("set-reminder tool", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  test("throws if addReminder not injected", async () => {
    const { setReminderTool } = await import("../../src/agent/tools/set-reminder");
    await expect(
      setReminderTool.execute!({ text: "test", dueAt: "2026-01-01T00:00:00Z" }, {} as never),
    ).rejects.toThrow("addReminder not injected");
  });

  test("calls injected addReminder", async () => {
    const { setReminderTool, injectAddReminder } = await import("../../src/agent/tools/set-reminder");
    const mockAdd = vi.fn().mockResolvedValue(undefined);
    injectAddReminder(mockAdd);

    const result = await setReminderTool.execute!({ text: "buy milk", dueAt: "2026-03-22T14:00:00Z" }, {} as never);

    expect(mockAdd).toHaveBeenCalledWith({
      text: "buy milk",
      dueAt: "2026-03-22T14:00:00Z",
    });
    expect(result).toEqual({ saved: true });
  });
});

describe("web-search tool", () => {
  test("returns stub results", async () => {
    const { webSearchTool } = await import("../../src/agent/tools/web-search");
    const result = (await webSearchTool.execute!({ query: "test query" }, {} as never)) as {
      results: { title: string; url: string; snippet: string }[];
    };
    expect(result.results).toHaveLength(1);
    expect(result.results[0]!.title).toBe("Web search not configured");
  });

  test("has correct tool metadata", async () => {
    const { webSearchTool } = await import("../../src/agent/tools/web-search");
    expect(webSearchTool.id).toBe("web-search");
  });
});
