import { describe, it, expect } from "vitest";
import { GET } from "@/app/skill.md/route";

describe("skill.md route", () => {
  it("returns a response", async () => {
    const response = await GET();
    expect(response).toBeDefined();
    expect(response.headers.get("Content-Type")).toContain("text/markdown");
  });

  it("returns content from SKILL.md file", async () => {
    const response = await GET();
    const text = await response.text();
    // The SKILL.md file exists at the project root, so it should have content
    expect(text.length).toBeGreaterThan(0);
    expect(text).toContain("moltcourt");
  });
});
