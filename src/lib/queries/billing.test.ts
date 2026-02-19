import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  useSubscription,
  useUsage,
  useCheckout,
  usePortal,
  useInvoices,
  billingKeys,
} from "./billing";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    );
  };
}

describe("billing hooks", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("billingKeys", () => {
    it("defines all query keys", () => {
      expect(billingKeys.subscription).toEqual(["billing", "subscription"]);
      expect(billingKeys.usage).toEqual(["billing", "usage"]);
      expect(billingKeys.invoices).toEqual(["billing", "invoices"]);
    });
  });

  describe("useSubscription", () => {
    it("fetches subscription data", async () => {
      const mockSub = { plan: "starter", status: "active" };
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ subscription: mockSub }),
      } as Response);

      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockSub);
    });

    it("returns null when no subscription", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ subscription: null }),
      } as Response);

      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toBeNull();
    });
  });

  describe("useUsage", () => {
    it("fetches usage data", async () => {
      const mockUsage = {
        posts_used: 12,
        posts_limit: 30,
        ai_improvements_used: 1,
        ai_improvements_limit: 5,
        insights_used: 2,
        insights_limit: 5,
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ usage: mockUsage }),
      } as Response);

      const { result } = renderHook(() => useUsage(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockUsage);
    });
  });

  describe("useCheckout", () => {
    it("sends checkout request and returns URL", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ url: "https://checkout.stripe.com/session" }),
      } as Response);

      const { result } = renderHook(() => useCheckout(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        plan: "starter",
        billing_cycle: "monthly",
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toBe("https://checkout.stripe.com/session");
    });
  });

  describe("usePortal", () => {
    it("sends portal request and returns URL", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ url: "https://billing.stripe.com/portal" }),
      } as Response);

      const { result } = renderHook(() => usePortal(), {
        wrapper: createWrapper(),
      });

      result.current.mutate();

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toBe("https://billing.stripe.com/portal");
    });
  });

  describe("useInvoices", () => {
    it("fetches invoices", async () => {
      const mockInvoices = [
        { id: "inv_1", amount: 1900, status: "paid" },
      ];

      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ invoices: mockInvoices }),
      } as Response);

      const { result } = renderHook(() => useInvoices(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockInvoices);
    });
  });
});
