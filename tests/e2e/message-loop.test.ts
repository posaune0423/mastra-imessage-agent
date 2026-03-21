import { describe, expect, it, vi } from "vitest";

import { createDirectMessageHandler } from "../../src/main";
import { samePhone } from "../../src/utils/phone";

describe("message loop", () => {
  const ownerPhone = "+819012345678";

  it("owner phone matches with samePhone", () => {
    expect(samePhone("+819012345678", ownerPhone)).toBe(true);
  });

  it("non-owner phone does not match", () => {
    expect(samePhone("+819099999999", ownerPhone)).toBe(false);
  });

  it("routes a normal direct message through the agent with tool options", async () => {
    const generate = vi.fn().mockResolvedValue({ text: "了解しました。" });
    const sendMessage = vi.fn();
    const resolveToolsets = vi.fn().mockResolvedValue({});
    const handler = createDirectMessageHandler({
      ownerPhone,
      agent: { generate } as never,
      sendMessage,
      resolveToolsets,
      maxSteps: 3,
    });

    await handler({ sender: "+819012345678", text: "こんにちは" });

    expect(generate).toHaveBeenCalledWith("こんにちは", {
      memory: { resource: "+819012345678", thread: "default" },
      maxSteps: 3,
      toolsets: {},
    });
    expect(sendMessage).toHaveBeenCalledWith("+819012345678", "了解しました。");
  });

  it("routes scheduling requests through the agent instead of bypassing it", async () => {
    const generate = vi.fn().mockResolvedValue({ text: "明日9:00にリマインダーを設定しました。" });
    const sendMessage = vi.fn();
    const handler = createDirectMessageHandler({
      ownerPhone,
      agent: { generate } as never,
      sendMessage,
      maxSteps: 3,
    });

    await handler({ sender: "+819012345678", text: "1分後に私に話しかけてください" });

    expect(generate).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith("+819012345678", "明日9:00にリマインダーを設定しました。");
  });
});
