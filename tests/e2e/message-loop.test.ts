import { describe, expect, it, vi } from "vitest";

import { samePhone } from "../../src/utils/phone";

describe("message loop", () => {
  const ownerPhone = "+819012345678";

  it("owner phone matches with samePhone", () => {
    expect(samePhone("+819012345678", ownerPhone)).toBe(true);
  });

  it("non-owner phone does not match", () => {
    expect(samePhone("+819099999999", ownerPhone)).toBe(false);
  });

  it("agent.generate is called with correct memory options", async () => {
    const generate = vi.fn().mockResolvedValue({ text: "了解しました。" });

    const sender = "+819012345678";
    const text = "こんにちは";

    const result = await generate(text, {
      memory: { resource: sender, thread: "default" },
    });

    expect(generate).toHaveBeenCalledWith("こんにちは", {
      memory: { resource: "+819012345678", thread: "default" },
    });
    expect(result.text.trim()).toBe("了解しました。");
  });
});
