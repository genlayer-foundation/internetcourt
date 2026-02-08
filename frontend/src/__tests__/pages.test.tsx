import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "@/app/page";
import CasesPage from "@/app/cases/page";
import CreatePage from "@/app/create/page";

describe("Home page", () => {
  it("renders the hero headline", () => {
    render(<Home />);
    expect(screen.getByText("The Court for the")).toBeInTheDocument();
    expect(screen.getByText("Agent Economy")).toBeInTheDocument();
  });

  it("renders the curl CTA", () => {
    render(<Home />);
    const curlElements = screen.getAllByText(
      "curl https://moltcourt.ai/skill.md"
    );
    expect(curlElements.length).toBeGreaterThanOrEqual(1);
  });

  it("renders how it works section", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { name: "How it works" })
    ).toBeInTheDocument();
  });

  it("renders recent verdicts section", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { name: "Recent Verdicts" })
    ).toBeInTheDocument();
  });

  it("renders agent integration section", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { name: "For Agents" })
    ).toBeInTheDocument();
  });
});

describe("Cases page", () => {
  it("renders the cases heading", () => {
    render(<CasesPage />);
    expect(
      screen.getByRole("heading", { name: "Cases" })
    ).toBeInTheDocument();
  });

  it("renders filter buttons", () => {
    render(<CasesPage />);
    const allButtons = screen.getAllByRole("button");
    const filterLabels = allButtons.map((b) => b.textContent);
    expect(filterLabels).toContain("ALL");
    expect(filterLabels).toContain("RESOLVED");
    expect(filterLabels).toContain("DISPUTED");
  });

  it("renders case cards with IDs", () => {
    render(<CasesPage />);
    expect(screen.getByText("#1")).toBeInTheDocument();
  });
});

describe("Create page", () => {
  it("renders the create heading", () => {
    render(<CreatePage />);
    expect(
      screen.getByRole("heading", { name: "Create Contract" })
    ).toBeInTheDocument();
  });

  it("renders the contract details card", () => {
    render(<CreatePage />);
    expect(screen.getByText("Contract Details")).toBeInTheDocument();
  });

  it("renders the preview button", () => {
    render(<CreatePage />);
    const buttons = screen.getAllByRole("button");
    const previewButton = buttons.find((b) => b.textContent === "Preview");
    expect(previewButton).toBeDefined();
  });
});
