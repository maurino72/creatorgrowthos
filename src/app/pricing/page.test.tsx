import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const mockCheckout = vi.fn();
vi.mock("@/lib/queries/billing", () => ({
  useCheckout: () => ({
    mutate: mockCheckout,
    isPending: false,
  }),
  useSubscription: () => ({
    data: null,
    isLoading: false,
  }),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    );
  };
}

async function importPage() {
  const mod = await import("./page");
  return mod.default;
}

describe("PricingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders three plan cards", async () => {
    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    // Plan names appear in both cards and comparison table header
    const starters = screen.getAllByText("Starter");
    expect(starters.length).toBeGreaterThanOrEqual(1);
    const businesses = screen.getAllByText("Business");
    expect(businesses.length).toBeGreaterThanOrEqual(1);
    const agencies = screen.getAllByText("Agency");
    expect(agencies.length).toBeGreaterThanOrEqual(1);
  });

  it("shows monthly prices by default", async () => {
    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText("$19")).toBeInTheDocument();
    expect(screen.getByText("$49")).toBeInTheDocument();
    expect(screen.getByText("$99")).toBeInTheDocument();
  });

  it("toggles to yearly prices", async () => {
    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    const yearlyToggle = screen.getByText("Annual");
    fireEvent.click(yearlyToggle);

    expect(screen.getByText("$15.83")).toBeInTheDocument();
    expect(screen.getByText("$40.83")).toBeInTheDocument();
    expect(screen.getByText("$82.5")).toBeInTheDocument();
  });

  it("shows savings badges in yearly mode", async () => {
    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    const yearlyToggle = screen.getByText("Annual");
    fireEvent.click(yearlyToggle);

    // Text is split across spans (number in font-mono span), so use container text
    const savingsBadges = screen.getAllByText((content, element) => {
      return element?.tagName === "SPAN" && /Save.*\$\d+.*\/yr/.test(element.textContent || "");
    });
    expect(savingsBadges).toHaveLength(3);
  });

  it("shows Most Popular badge on Business card", async () => {
    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText("Most Popular")).toBeInTheDocument();
  });

  it("shows 14-day free trial text", async () => {
    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    const trialTexts = screen.getAllByText(/14-day free trial/);
    expect(trialTexts.length).toBeGreaterThanOrEqual(1);
  });

  it("renders Start Free Trial buttons for cards and comparison table", async () => {
    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    const buttons = screen.getAllByRole("button", {
      name: /Start Free Trial/,
    });
    // 3 in cards + 3 in comparison table footer
    expect(buttons).toHaveLength(6);
  });

  it("calls checkout with correct plan when Start Free Trial is clicked", async () => {
    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    const buttons = screen.getAllByRole("button", {
      name: /Start Free Trial/,
    });
    // Click the Starter button (first one)
    fireEvent.click(buttons[0]);

    expect(mockCheckout).toHaveBeenCalledWith(
      { plan: "starter", billing_cycle: "monthly" },
      expect.anything()
    );
  });

  it("shows feature lists for each plan", async () => {
    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText("1 platform")).toBeInTheDocument();
    expect(screen.getByText("30 posts/month")).toBeInTheDocument();
    expect(screen.getByText("3 platforms")).toBeInTheDocument();
    expect(screen.getByText("100 posts/month")).toBeInTheDocument();
    expect(screen.getByText("Unlimited platforms")).toBeInTheDocument();
  });

  it("renders feature comparison table", async () => {
    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByTestId("comparison-table")).toBeInTheDocument();
    expect(screen.getByText("Plans and features")).toBeInTheDocument();
    // Category headers
    expect(screen.getByText("Content")).toBeInTheDocument();
    expect(screen.getByText("Platforms")).toBeInTheDocument();
    expect(screen.getByText("AI & Intelligence")).toBeInTheDocument();
    expect(screen.getByText("Analytics")).toBeInTheDocument();
    expect(screen.getByText("Support")).toBeInTheDocument();
  });

  it("renders FAQ section", async () => {
    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByTestId("faq-section")).toBeInTheDocument();
    expect(screen.getByText("Questions & answers")).toBeInTheDocument();
    expect(screen.getByText("How does the 14-day free trial work?")).toBeInTheDocument();
  });

  it("toggles FAQ items on click", async () => {
    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    const faqButton = screen.getByText("How does the 14-day free trial work?");
    fireEvent.click(faqButton);

    expect(
      screen.getByText(/full access to your chosen plan/)
    ).toBeInTheDocument();
  });
});
