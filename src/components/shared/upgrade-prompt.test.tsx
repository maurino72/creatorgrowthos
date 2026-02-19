import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { UpgradePrompt } from "./upgrade-prompt";

vi.mock("@/lib/queries/billing", () => ({
  useCheckout: () => ({
    mutate: vi.fn(),
    isPending: false,
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

describe("UpgradePrompt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with feature name and upgrade target", () => {
    render(
      <UpgradePrompt
        feature="AI Ideation"
        upgradeTo="business"
        onDismiss={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    expect(
      screen.getByText("Upgrade to Business to unlock AI Ideation")
    ).toBeInTheDocument();
  });

  it("shows upgrade button", () => {
    render(
      <UpgradePrompt
        feature="content import"
        upgradeTo="business"
        onDismiss={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    expect(
      screen.getByRole("button", { name: /Upgrade/i })
    ).toBeInTheDocument();
  });

  it("calls onDismiss when dismiss button is clicked", () => {
    const onDismiss = vi.fn();
    render(
      <UpgradePrompt
        feature="trend detection"
        upgradeTo="agency"
        onDismiss={onDismiss}
      />,
      { wrapper: createWrapper() }
    );

    fireEvent.click(screen.getByText("Maybe later"));
    expect(onDismiss).toHaveBeenCalled();
  });

  it("shows limit-reached variant", () => {
    render(
      <UpgradePrompt
        feature="posts"
        upgradeTo="business"
        variant="limit"
        currentUsage="30/30"
        onDismiss={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText(/30\/30/)).toBeInTheDocument();
  });
});
