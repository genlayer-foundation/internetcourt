import { describe, it, expect } from "vitest";
import {
  mockContracts,
  getContract,
  getContractsByStatus,
  formatAddress,
  formatEscrow,
} from "@/lib/mock-data";

describe("mock data", () => {
  it("has contracts", () => {
    expect(mockContracts.length).toBeGreaterThan(0);
  });

  it("getContract returns correct contract", () => {
    const c = getContract("1");
    expect(c).toBeDefined();
    expect(c!.id).toBe("1");
  });

  it("getContract returns undefined for missing id", () => {
    expect(getContract("999")).toBeUndefined();
  });

  it("getContractsByStatus filters correctly", () => {
    const resolved = getContractsByStatus("RESOLVED");
    expect(resolved.length).toBeGreaterThan(0);
    resolved.forEach((c) => expect(c.status).toBe("RESOLVED"));
  });

  it("getContractsByStatus returns all for ALL", () => {
    expect(getContractsByStatus("ALL")).toEqual(mockContracts);
  });

  it("formatAddress truncates correctly", () => {
    expect(formatAddress("0x1234567890abcdef")).toBe("0x1234...cdef");
  });

  it("formatEscrow formats USDL correctly", () => {
    expect(formatEscrow("50000000")).toBe("50 USDL");
    expect(formatEscrow("100000000")).toBe("100 USDL");
  });
});
