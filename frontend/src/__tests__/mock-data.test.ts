import { describe, it, expect } from "vitest";
import { formatAddress } from "@/lib/utils";

describe("utils", () => {
  it("formatAddress truncates correctly", () => {
    expect(formatAddress("0x1234567890abcdef")).toBe("0x1234...cdef");
  });

  it("formatAddress returns dash for empty", () => {
    expect(formatAddress("")).toBe("—");
  });

  it("formatAddress handles short addresses", () => {
    expect(formatAddress("0x1234")).toBe("0x1234");
  });
});
