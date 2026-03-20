import { describe, test, expect } from "vitest";
import { normalizePhone } from "../../src/utils/phone";

describe("normalizePhone", () => {
  test("removes spaces", () => {
    expect(normalizePhone("+81 90 1234 5678")).toBe("+819012345678");
  });

  test("removes hyphens", () => {
    expect(normalizePhone("+81-90-1234-5678")).toBe("+819012345678");
  });

  test("removes parentheses", () => {
    expect(normalizePhone("+1 (234) 567-890")).toBe("+1234567890");
  });

  test("removes dots", () => {
    expect(normalizePhone("+1.234.567.890")).toBe("+1234567890");
  });

  test("handles mixed formatting", () => {
    expect(normalizePhone("+81 (90) 1234-5678")).toBe("+819012345678");
  });

  test("passes through already clean numbers", () => {
    expect(normalizePhone("+819012345678")).toBe("+819012345678");
  });

  test("handles empty string", () => {
    expect(normalizePhone("")).toBe("");
  });
});
