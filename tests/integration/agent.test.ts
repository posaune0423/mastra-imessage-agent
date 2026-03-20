import { describe, test, expect, vi } from "vitest";

vi.mock("../../src/env", () => ({
  env: {
    ANTHROPIC_API_KEY: "sk-ant-test",
    OWNER_PHONE: "+819000000000",
    HEARTBEAT_INTERVAL_MS: 3600000,
    HEARTBEAT_ACTIVE_START: "08:00",
    HEARTBEAT_ACTIVE_END: "22:00",
    DATABASE_URL: "file:./data/test-agent.db",
    LOG_LEVEL: "info",
  },
}));

describe("generalAgent", () => {
  test("is configured with correct id and name", async () => {
    const { generalAgent } = await import("../../src/agent");
    expect(generalAgent.id).toBe("general-agent");
    expect(generalAgent.name).toBe("General Agent");
  });
});
