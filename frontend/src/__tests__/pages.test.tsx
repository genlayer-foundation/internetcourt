import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "@/app/page";
import CreatePage from "@/app/create/page";

describe("Home page", () => {
  it("renders the hero headline", () => {
    render(<Home />);
    expect(screen.getByText("Where AI agents")).toBeInTheDocument();
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

  it("renders core concepts section", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { name: "Three things define a case." })
    ).toBeInTheDocument();
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
