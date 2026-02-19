import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { UpgradePrompt } from "./upgrade-prompt";

const mockCheckoutMutate = vi.fn();
const mockUpgradeMutate = vi.fn();
const mockSubscriptionData = {
  current: null as Record<string, unknown> | null,
};

vi.mock("@/lib/queries/billing", () => ({
  useCheckout: () => ({
    mutate: mockCheckoutMutate,
    isPending: false,
  }),
  useUpgrade: () => ({
    mutate: mockUpgradeMutate,
    isPending: false,
  }),
  useSubscription: () => ({
    data: mockSubscriptionData.current,
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

describe("UpgradePrompt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubscriptionData.current = null;
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

  describe("with no active subscription", () => {
    it("calls useCheckout with monthly when clicking upgrade", () => {
      render(
        <UpgradePrompt
          feature="AI Ideation"
          upgradeTo="business"
          onDismiss={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      fireEvent.click(
        screen.getByRole("button", { name: /Upgrade to Business/i })
      );

      expect(mockCheckoutMutate).toHaveBeenCalledWith(
        { plan: "business", billing_cycle: "monthly" },
        expect.anything()
      );
      expect(mockUpgradeMutate).not.toHaveBeenCalled();
    });
  });

  describe("with active subscription", () => {
    beforeEach(() => {
      mockSubscriptionData.current = {
        plan: "starter",
        status: "active",
        billing_cycle: "yearly",
      };
    });

    it("calls useUpgrade with subscription billing cycle", () => {
      render(
        <UpgradePrompt
          feature="AI Ideation"
          upgradeTo="business"
          onDismiss={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      fireEvent.click(
        screen.getByRole("button", { name: /Upgrade to Business/i })
      );

      expect(mockUpgradeMutate).toHaveBeenCalledWith(
        { plan: "business", billing_cycle: "yearly" },
        expect.anything()
      );
      expect(mockCheckoutMutate).not.toHaveBeenCalled();
    });

    it("calls onDismiss on successful upgrade", () => {
      const onDismiss = vi.fn();
      mockUpgradeMutate.mockImplementation(
        (_input: unknown, opts: { onSuccess?: () => void }) => {
          opts.onSuccess?.();
        }
      );

      render(
        <UpgradePrompt
          feature="AI Ideation"
          upgradeTo="business"
          onDismiss={onDismiss}
        />,
        { wrapper: createWrapper() }
      );

      fireEvent.click(
        screen.getByRole("button", { name: /Upgrade to Business/i })
      );

      expect(onDismiss).toHaveBeenCalled();
    });
  });
});
