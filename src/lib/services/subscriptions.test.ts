import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import {
  getSubscriptionForUser,
  upsertSubscription,
  isSubscriptionActive,
} from "./subscriptions";

function mockSupabase(overrides: Record<string, unknown> = {}) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    data: null as unknown,
    error: null as unknown,
    ...overrides,
  };

  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.single.mockImplementation(() =>
    Promise.resolve({ data: chain.data, error: chain.error })
  );
  chain.upsert.mockReturnValue(chain);
  chain.insert.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);

  const from = vi.fn().mockReturnValue(chain);
  vi.mocked(createAdminClient).mockReturnValue({ from } as never);

  return { from, chain };
}

const TEST_USER_ID = "user-123";

describe("subscriptions service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSubscriptionForUser", () => {
    it("returns subscription data for user", async () => {
      const mockSub = {
        id: "sub-1",
        user_id: TEST_USER_ID,
        stripe_customer_id: "cus_123",
        stripe_subscription_id: "sub_123",
        plan: "starter",
        status: "active",
        billing_cycle: "monthly",
        current_period_start: "2024-01-01T00:00:00Z",
        current_period_end: "2024-02-01T00:00:00Z",
        cancel_at_period_end: false,
        canceled_at: null,
        trial_end: null,
      };

      const { chain } = mockSupabase();
      chain.single.mockResolvedValue({ data: mockSub, error: null });

      const result = await getSubscriptionForUser(TEST_USER_ID);
      expect(result).toEqual(mockSub);
    });

    it("returns null when no subscription exists", async () => {
      const { chain } = mockSupabase();
      chain.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "not found" },
      });

      const result = await getSubscriptionForUser(TEST_USER_ID);
      expect(result).toBeNull();
    });

    it("throws on database error", async () => {
      const { chain } = mockSupabase();
      chain.single.mockResolvedValue({
        data: null,
        error: { code: "42P01", message: "relation does not exist" },
      });

      await expect(getSubscriptionForUser(TEST_USER_ID)).rejects.toThrow(
        "relation does not exist"
      );
    });
  });

  describe("upsertSubscription", () => {
    it("upserts subscription data", async () => {
      const mockSub = {
        id: "sub-1",
        user_id: TEST_USER_ID,
        stripe_customer_id: "cus_123",
        plan: "business",
        status: "trialing",
        billing_cycle: "monthly",
      };

      const { chain } = mockSupabase();
      chain.select.mockReturnValue(chain);
      chain.single.mockResolvedValue({ data: mockSub, error: null });

      const result = await upsertSubscription(TEST_USER_ID, {
        stripe_customer_id: "cus_123",
        plan: "business",
        status: "trialing",
        billing_cycle: "monthly",
      });

      expect(result).toEqual(mockSub);
    });

    it("throws on upsert error", async () => {
      const { chain } = mockSupabase();
      chain.select.mockReturnValue(chain);
      chain.single.mockResolvedValue({
        data: null,
        error: { message: "upsert failed" },
      });

      await expect(
        upsertSubscription(TEST_USER_ID, {
          stripe_customer_id: "cus_123",
          plan: "starter",
          status: "active",
          billing_cycle: "monthly",
        })
      ).rejects.toThrow("upsert failed");
    });
  });

  describe("isSubscriptionActive", () => {
    it("returns true for active status", async () => {
      const { chain } = mockSupabase();
      chain.single.mockResolvedValue({
        data: {
          status: "active",
          current_period_end: new Date(
            Date.now() + 86400000
          ).toISOString(),
        },
        error: null,
      });

      const result = await isSubscriptionActive(TEST_USER_ID);
      expect(result).toBe(true);
    });

    it("returns true for trialing status", async () => {
      const { chain } = mockSupabase();
      chain.single.mockResolvedValue({
        data: {
          status: "trialing",
          current_period_end: new Date(
            Date.now() + 86400000
          ).toISOString(),
        },
        error: null,
      });

      const result = await isSubscriptionActive(TEST_USER_ID);
      expect(result).toBe(true);
    });

    it("returns true for past_due status (grace period)", async () => {
      const { chain } = mockSupabase();
      chain.single.mockResolvedValue({
        data: {
          status: "past_due",
          current_period_end: new Date(
            Date.now() + 86400000
          ).toISOString(),
        },
        error: null,
      });

      const result = await isSubscriptionActive(TEST_USER_ID);
      expect(result).toBe(true);
    });

    it("returns true for canceled status within period", async () => {
      const { chain } = mockSupabase();
      chain.single.mockResolvedValue({
        data: {
          status: "canceled",
          current_period_end: new Date(
            Date.now() + 86400000
          ).toISOString(),
        },
        error: null,
      });

      const result = await isSubscriptionActive(TEST_USER_ID);
      expect(result).toBe(true);
    });

    it("returns false for canceled status past period end", async () => {
      const { chain } = mockSupabase();
      chain.single.mockResolvedValue({
        data: {
          status: "canceled",
          current_period_end: new Date(
            Date.now() - 86400000
          ).toISOString(),
        },
        error: null,
      });

      const result = await isSubscriptionActive(TEST_USER_ID);
      expect(result).toBe(false);
    });

    it("returns false for unpaid status", async () => {
      const { chain } = mockSupabase();
      chain.single.mockResolvedValue({
        data: {
          status: "unpaid",
          current_period_end: new Date(
            Date.now() + 86400000
          ).toISOString(),
        },
        error: null,
      });

      const result = await isSubscriptionActive(TEST_USER_ID);
      expect(result).toBe(false);
    });

    it("returns false for incomplete status", async () => {
      const { chain } = mockSupabase();
      chain.single.mockResolvedValue({
        data: {
          status: "incomplete",
          current_period_end: null,
        },
        error: null,
      });

      const result = await isSubscriptionActive(TEST_USER_ID);
      expect(result).toBe(false);
    });

    it("returns false when no subscription exists", async () => {
      const { chain } = mockSupabase();
      chain.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "not found" },
      });

      const result = await isSubscriptionActive(TEST_USER_ID);
      expect(result).toBe(false);
    });
  });
});
