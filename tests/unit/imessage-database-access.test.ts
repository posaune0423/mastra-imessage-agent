import { describe, expect, test, vi } from "vitest";
import {
  assertIMessageDatabaseReady,
  formatIMessageDatabaseAccessError,
  isIMessageAuthorizationError,
} from "../../src/imessage/database-access";

describe("iMessage database access", () => {
  test("detects macOS authorization errors", () => {
    expect(isIMessageAuthorizationError(new Error("authorization denied"))).toBe(true);
    expect(isIMessageAuthorizationError(new Error("authn denied"))).toBe(true);
    expect(isIMessageAuthorizationError(new Error("something else"))).toBe(false);
  });

  test("formats authorization failures with remediation", () => {
    const message = formatIMessageDatabaseAccessError(
      "/Users/test/Library/Messages/chat.db",
      new Error("Failed to open database: authorization denied"),
    );

    expect(message).toContain("Full Disk Access");
    expect(message).toContain("/Users/test/Library/Messages/chat.db");
  });

  test("probes the database before starting the watcher", async () => {
    const sdk = {
      getMessages: vi.fn().mockResolvedValue({ messages: [], total: 0 }),
    };

    await expect(assertIMessageDatabaseReady(sdk as never, "/tmp/chat.db")).resolves.toBeUndefined();
    expect(sdk.getMessages).toHaveBeenCalledWith({
      limit: 1,
      excludeOwnMessages: false,
    });
  });

  test("wraps probe failures with a startup-safe error", async () => {
    const sdk = {
      getMessages: vi.fn().mockRejectedValue(new Error("authn denied")),
    };

    await expect(assertIMessageDatabaseReady(sdk as never, "/tmp/chat.db")).rejects.toThrow(/Full Disk Access/);
  });
});
