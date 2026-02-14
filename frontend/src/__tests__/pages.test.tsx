import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "@/app/page";

// Mock next/navigation for components that use useRouter
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

describe("Home page", () => {
  it("renders the hero headline", () => {
    render(<Home />);
    expect(
      screen.getByText(/Dispute resolution/i)
    ).toBeInTheDocument();
  });

  it("renders the curl CTA", () => {
    render(<Home />);
    const curlElements = screen.getAllByText(
      /curl.*https:\/\/internetcourt\.org\/skill\.md/
    );
    expect(curlElements.length).toBeGreaterThanOrEqual(1);
  });

  it("renders how it works section", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { name: /How does a case work/i })
    ).toBeInTheDocument();
  });

  it("renders recent cases section", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { name: /Recent Cases/i })
    ).toBeInTheDocument();
  });
});

describe("Create page", () => {
  it("renders the create page", async () => {
    const { default: CreatePage } = await import("@/app/create/page");
    render(<CreatePage />);
    expect(
      screen.getByText("Contract Details")
    ).toBeInTheDocument();
  });

  it("renders the preview button", async () => {
    const { default: CreatePage } = await import("@/app/create/page");
    render(<CreatePage />);
    const buttons = screen.getAllByRole("button");
    const previewButton = buttons.find((b) =>
      b.textContent?.includes("Preview")
    );
    expect(previewButton).toBeDefined();
  });
});
