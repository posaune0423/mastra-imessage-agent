import { describe, expect, it } from "vitest";

import { loadTextFile } from "../../src/utils/fs";

describe("agent markdown files", () => {
  it("loads SOUL.md from src/agents", () => {
    const soul = loadTextFile(new URL("../../src/agents/SOUL.md", import.meta.url));
    expect(soul).toContain("personal assistant");
    expect(soul).toContain("scheduled message");
  });

  it("loads HEARTBEAT.md from src/agents", () => {
    const heartbeat = loadTextFile(new URL("../../src/agents/HEARTBEAT.md", import.meta.url));
    expect(heartbeat).toContain("HEARTBEAT_OK");
    expect(heartbeat).toContain("scheduling");
  });
});
