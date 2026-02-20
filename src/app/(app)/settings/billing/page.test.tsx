import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const mockPortal = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/queries/billing", () => ({
  useSubscription: vi.fn(),
  useUsage: vi.fn(),
  useInvoices: vi.fn(),
  usePortal: () => ({
    mutate: mockPortal,
    isPending: false,
  }),
}));

import { useSubscription, useUsage, useInvoices } from "@/lib/queries/billing";

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

describe("BillingSettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading skeleton when data is loading", async () => {
    vi.mocked(useSubscription).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as never);
    vi.mocked(useUsage).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as never);
    vi.mocked(useInvoices).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText("Billing & Subscription")).toBeInTheDocument();
  });

  it("displays current plan info", async () => {
    vi.mocked(useSubscription).mockReturnValue({
      data: {
        plan: "business",
        status: "active",
        billing_cycle: "monthly",
        current_period_end: "2024-02-01T00:00:00Z",
        cancel_at_period_end: false,
        trial_end: null,
      },
      isLoading: false,
    } as never);
    vi.mocked(useUsage).mockReturnValue({
      data: {
        posts_used: 45,
        posts_limit: 100,
        ai_improvements_used: 10,
        ai_improvements_limit: -1,
        insights_used: 5,
        insights_limit: -1,
      },
      isLoading: false,
    } as never);
    vi.mocked(useInvoices).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText("Business")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("displays trial info when trialing", async () => {
    const trialEnd = new Date(Date.now() + 7 * 86400000).toISOString();
    vi.mocked(useSubscription).mockReturnValue({
      data: {
        plan: "starter",
        status: "trialing",
        billing_cycle: "monthly",
        current_period_end: trialEnd,
        cancel_at_period_end: false,
        trial_end: trialEnd,
      },
      isLoading: false,
    } as never);
    vi.mocked(useUsage).mockReturnValue({
      data: {
        posts_used: 5,
        posts_limit: 30,
        ai_improvements_used: 1,
        ai_improvements_limit: 5,
        insights_used: 0,
        insights_limit: 5,
      },
      isLoading: false,
    } as never);
    vi.mocked(useInvoices).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText("Trial")).toBeInTheDocument();
    expect(screen.getByText(/days remaining/)).toBeInTheDocument();
  });

  it("displays usage meters", async () => {
    vi.mocked(useSubscription).mockReturnValue({
      data: {
        plan: "starter",
        status: "active",
        billing_cycle: "monthly",
        current_period_end: "2024-02-01T00:00:00Z",
        cancel_at_period_end: false,
        trial_end: null,
      },
      isLoading: false,
    } as never);
    vi.mocked(useUsage).mockReturnValue({
      data: {
        posts_used: 12,
        posts_limit: 30,
        ai_improvements_used: 3,
        ai_improvements_limit: 5,
        insights_used: 2,
        insights_limit: 5,
      },
      isLoading: false,
    } as never);
    vi.mocked(useInvoices).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText("Posts")).toBeInTheDocument();
    expect(screen.getByText("12 / 30")).toBeInTheDocument();
    expect(screen.getByText("AI Improvements")).toBeInTheDocument();
    expect(screen.getByText("3 / 5")).toBeInTheDocument();
  });

  it("shows Manage Subscription button", async () => {
    vi.mocked(useSubscription).mockReturnValue({
      data: {
        plan: "business",
        status: "active",
        billing_cycle: "monthly",
        current_period_end: "2024-02-01T00:00:00Z",
        cancel_at_period_end: false,
        trial_end: null,
      },
      isLoading: false,
    } as never);
    vi.mocked(useUsage).mockReturnValue({
      data: null,
      isLoading: false,
    } as never);
    vi.mocked(useInvoices).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    const manageButton = screen.getByRole("button", {
      name: /Manage Subscription/,
    });
    expect(manageButton).toBeInTheDocument();

    fireEvent.click(manageButton);
    expect(mockPortal).toHaveBeenCalled();
  });

  it("shows invoices when available", async () => {
    vi.mocked(useSubscription).mockReturnValue({
      data: {
        plan: "business",
        status: "active",
        billing_cycle: "monthly",
        current_period_end: "2024-02-01T00:00:00Z",
        cancel_at_period_end: false,
        trial_end: null,
      },
      isLoading: false,
    } as never);
    vi.mocked(useUsage).mockReturnValue({
      data: null,
      isLoading: false,
    } as never);
    vi.mocked(useInvoices).mockReturnValue({
      data: [
        {
          id: "inv_1",
          amount: 4900,
          currency: "usd",
          status: "paid",
          invoice_url: "https://stripe.com/inv_1",
          created_at: "2024-01-01T00:00:00Z",
        },
      ],
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText("Billing History")).toBeInTheDocument();
    expect(screen.getByText("$49.00")).toBeInTheDocument();
    expect(screen.getByText("Paid")).toBeInTheDocument();
  });
});
