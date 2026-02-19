import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const mockCheckout = vi.fn();
const mockUpgrade = vi.fn();

const mockSubscriptionData = { current: null as Record<string, unknown> | null };

vi.mock("@/lib/queries/billing", () => ({
  useCheckout: () => ({
    mutate: mockCheckout,
    isPending: false,
  }),
  useUpgrade: () => ({
    mutate: mockUpgrade,
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

async function importPage() {
  const mod = await import("./page");
  return mod.default;
}

describe("PricingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubscriptionData.current = null;
  });

  describe("new subscriber (no subscription)", () => {
    it("renders three plan cards", async () => {
      const Page = await importPage();
      render(<Page />, { wrapper: createWrapper() });

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

      const savingsBadges = screen.getAllByText((content, element) => {
        return (
          element?.tagName === "SPAN" &&
          /Save.*\$\d+.*\/yr/.test(element.textContent || "")
        );
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
      expect(
        screen.getByText("How does the 14-day free trial work?")
      ).toBeInTheDocument();
    });

    it("toggles FAQ items on click", async () => {
      const Page = await importPage();
      render(<Page />, { wrapper: createWrapper() });

      const faqButton = screen.getByText(
        "How does the 14-day free trial work?"
      );
      fireEvent.click(faqButton);

      expect(
        screen.getByText(/full access to your chosen plan/)
      ).toBeInTheDocument();
    });
  });

  describe("existing subscriber", () => {
    beforeEach(() => {
      mockSubscriptionData.current = {
        plan: "starter",
        status: "active",
        billing_cycle: "monthly",
      };
    });

    it("shows Current Plan on the active plan card", async () => {
      const Page = await importPage();
      render(<Page />, { wrapper: createWrapper() });

      const currentButtons = screen.getAllByRole("button", {
        name: /Current Plan/,
      });
      expect(currentButtons.length).toBeGreaterThanOrEqual(1);
    });

    it("shows Upgrade to Business on business card for starter subscriber", async () => {
      const Page = await importPage();
      render(<Page />, { wrapper: createWrapper() });

      const upgradeButtons = screen.getAllByRole("button", {
        name: /Upgrade to Business/,
      });
      expect(upgradeButtons.length).toBeGreaterThanOrEqual(1);
    });

    it("shows Upgrade to Agency on agency card for starter subscriber", async () => {
      const Page = await importPage();
      render(<Page />, { wrapper: createWrapper() });

      const upgradeButtons = screen.getAllByRole("button", {
        name: /Upgrade to Agency/,
      });
      expect(upgradeButtons.length).toBeGreaterThanOrEqual(1);
    });

    it("calls useUpgrade (not useCheckout) when upgrade button is clicked", async () => {
      const Page = await importPage();
      render(<Page />, { wrapper: createWrapper() });

      const upgradeButtons = screen.getAllByRole("button", {
        name: /Upgrade to Business/,
      });
      fireEvent.click(upgradeButtons[0]);

      expect(mockUpgrade).toHaveBeenCalledWith(
        { plan: "business", billing_cycle: "monthly" },
        expect.anything()
      );
      expect(mockCheckout).not.toHaveBeenCalled();
    });

    it("hides trial note under plan cards for subscribers", async () => {
      const Page = await importPage();
      render(<Page />, { wrapper: createWrapper() });

      // The card-level "14-day free trial · No credit card required" notes should be gone
      const trialNotes = screen.queryAllByText(/No credit card required/);
      expect(trialNotes).toHaveLength(0);
    });

    it("shows proration note for subscribers", async () => {
      const Page = await importPage();
      render(<Page />, { wrapper: createWrapper() });

      const prorationTexts = screen.getAllByText(/prorated/);
      expect(prorationTexts.length).toBeGreaterThanOrEqual(1);
    });

    it("shows Switch to Starter for business subscriber on starter card", async () => {
      mockSubscriptionData.current = {
        plan: "business",
        status: "active",
        billing_cycle: "monthly",
      };
      const Page = await importPage();
      render(<Page />, { wrapper: createWrapper() });

      const switchButtons = screen.getAllByRole("button", {
        name: /Switch to Starter/,
      });
      expect(switchButtons.length).toBeGreaterThanOrEqual(1);
    });

    it("defaults billing cycle to subscriber's current cycle", async () => {
      mockSubscriptionData.current = {
        plan: "starter",
        status: "active",
        billing_cycle: "yearly",
      };
      const Page = await importPage();
      render(<Page />, { wrapper: createWrapper() });

      // Yearly prices should be visible by default
      expect(screen.getByText("$15.83")).toBeInTheDocument();
    });
  });
});
