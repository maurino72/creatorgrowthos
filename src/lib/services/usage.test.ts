import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("./subscriptions", () => ({
  getSubscriptionForUser: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { getSubscriptionForUser } from "./subscriptions";
import {
  getOrCreateUsagePeriod,
  incrementUsage,
  getUserUsage,
  canPerformAction,
  getRemainingQuota,
} from "./usage";

function mockSupabase(overrides: Record<string, unknown> = {}) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
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
  chain.gte.mockReturnValue(chain);
  chain.lte.mockReturnValue(chain);
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

describe("usage service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getOrCreateUsagePeriod", () => {
    it("returns existing usage period", async () => {
      const mockUsage = {
        id: "usage-1",
        user_id: TEST_USER_ID,
        period_start: "2024-01-01",
        period_end: "2024-02-01",
        posts_count: 5,
        ai_requests_count: 2,
        insights_count: 1,
        content_improvements_count: 3,
      };

      const { chain } = mockSupabase();
      chain.single.mockResolvedValue({ data: mockUsage, error: null });

      const result = await getOrCreateUsagePeriod(
        TEST_USER_ID,
        "2024-01-01",
        "2024-02-01"
      );
      expect(result).toEqual(mockUsage);
    });

    it("creates new usage period when none exists", async () => {
      const newUsage = {
        id: "usage-2",
        user_id: TEST_USER_ID,
        period_start: "2024-01-01",
        period_end: "2024-02-01",
        posts_count: 0,
        ai_requests_count: 0,
        insights_count: 0,
        content_improvements_count: 0,
      };

      const { chain } = mockSupabase();
      chain.single.mockResolvedValue({ data: newUsage, error: null });

      const result = await getOrCreateUsagePeriod(
        TEST_USER_ID,
        "2024-01-01",
        "2024-02-01"
      );
      expect(result).toEqual(newUsage);
    });
  });

  describe("incrementUsage", () => {
    it("increments posts_count", async () => {
      vi.mocked(getSubscriptionForUser).mockResolvedValue({
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
        created_at: null,
        updated_at: null,
      });

      const { chain } = mockSupabase();
      // First call: getOrCreateUsagePeriod (upsert)
      chain.single.mockResolvedValueOnce({
        data: {
          id: "usage-1",
          posts_count: 5,
          ai_requests_count: 0,
          insights_count: 0,
          content_improvements_count: 0,
        },
        error: null,
      });
      // Second call: update
      chain.single.mockResolvedValueOnce({
        data: {
          id: "usage-1",
          posts_count: 6,
        },
        error: null,
      });

      const result = await incrementUsage(TEST_USER_ID, "posts_count");
      expect(result).toBeDefined();
    });
  });

  describe("getUserUsage", () => {
    it("returns usage with limits for user plan", async () => {
      vi.mocked(getSubscriptionForUser).mockResolvedValue({
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
        created_at: null,
        updated_at: null,
      });

      const { chain } = mockSupabase();
      chain.single.mockResolvedValue({
        data: {
          id: "usage-1",
          posts_count: 12,
          ai_requests_count: 3,
          insights_count: 2,
          content_improvements_count: 1,
        },
        error: null,
      });

      const result = await getUserUsage(TEST_USER_ID);
      expect(result.posts_used).toBe(12);
      expect(result.posts_limit).toBe(30);
      expect(result.ai_improvements_used).toBe(1);
      expect(result.ai_improvements_limit).toBe(5);
      expect(result.insights_used).toBe(2);
      expect(result.insights_limit).toBe(5);
    });

    it("returns null when no subscription exists", async () => {
      vi.mocked(getSubscriptionForUser).mockResolvedValue(null);

      const result = await getUserUsage(TEST_USER_ID);
      expect(result).toBeNull();
    });
  });

  describe("canPerformAction", () => {
    it("allows action when within limits", async () => {
      vi.mocked(getSubscriptionForUser).mockResolvedValue({
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
        created_at: null,
        updated_at: null,
      });

      const { chain } = mockSupabase();
      chain.single.mockResolvedValue({
        data: {
          id: "usage-1",
          posts_count: 10,
          ai_requests_count: 0,
          insights_count: 0,
          content_improvements_count: 0,
        },
        error: null,
      });

      const result = await canPerformAction(TEST_USER_ID, "create_post");
      expect(result.allowed).toBe(true);
    });

    it("blocks action when at limit", async () => {
      vi.mocked(getSubscriptionForUser).mockResolvedValue({
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
        created_at: null,
        updated_at: null,
      });

      const { chain } = mockSupabase();
      chain.single.mockResolvedValue({
        data: {
          id: "usage-1",
          posts_count: 30,
          ai_requests_count: 0,
          insights_count: 0,
          content_improvements_count: 0,
        },
        error: null,
      });

      const result = await canPerformAction(TEST_USER_ID, "create_post");
      expect(result.allowed).toBe(false);
      expect(result.upgrade_to).toBe("business");
    });

    it("always allows action for unlimited plans", async () => {
      vi.mocked(getSubscriptionForUser).mockResolvedValue({
        id: "sub-1",
        user_id: TEST_USER_ID,
        stripe_customer_id: "cus_123",
        stripe_subscription_id: "sub_123",
        plan: "agency",
        status: "active",
        billing_cycle: "monthly",
        current_period_start: "2024-01-01T00:00:00Z",
        current_period_end: "2024-02-01T00:00:00Z",
        cancel_at_period_end: false,
        canceled_at: null,
        trial_end: null,
        created_at: null,
        updated_at: null,
      });

      const { chain } = mockSupabase();
      chain.single.mockResolvedValue({
        data: {
          id: "usage-1",
          posts_count: 999,
          ai_requests_count: 0,
          insights_count: 0,
          content_improvements_count: 0,
        },
        error: null,
      });

      const result = await canPerformAction(TEST_USER_ID, "create_post");
      expect(result.allowed).toBe(true);
    });

    it("blocks ideation for starter plan", async () => {
      vi.mocked(getSubscriptionForUser).mockResolvedValue({
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
        created_at: null,
        updated_at: null,
      });

      const { chain } = mockSupabase();
      chain.single.mockResolvedValue({
        data: {
          id: "usage-1",
          posts_count: 0,
          ai_requests_count: 0,
          insights_count: 0,
          content_improvements_count: 0,
        },
        error: null,
      });

      const result = await canPerformAction(TEST_USER_ID, "ideation");
      expect(result.allowed).toBe(false);
      expect(result.upgrade_to).toBe("business");
    });

    it("allows ideation for business plan", async () => {
      vi.mocked(getSubscriptionForUser).mockResolvedValue({
        id: "sub-1",
        user_id: TEST_USER_ID,
        stripe_customer_id: "cus_123",
        stripe_subscription_id: "sub_123",
        plan: "business",
        status: "active",
        billing_cycle: "monthly",
        current_period_start: "2024-01-01T00:00:00Z",
        current_period_end: "2024-02-01T00:00:00Z",
        cancel_at_period_end: false,
        canceled_at: null,
        trial_end: null,
        created_at: null,
        updated_at: null,
      });

      const { chain } = mockSupabase();
      chain.single.mockResolvedValue({
        data: {
          id: "usage-1",
          posts_count: 0,
          ai_requests_count: 0,
          insights_count: 0,
          content_improvements_count: 0,
        },
        error: null,
      });

      const result = await canPerformAction(TEST_USER_ID, "ideation");
      expect(result.allowed).toBe(true);
    });

    it("blocks trend_detection for business plan", async () => {
      vi.mocked(getSubscriptionForUser).mockResolvedValue({
        id: "sub-1",
        user_id: TEST_USER_ID,
        stripe_customer_id: "cus_123",
        stripe_subscription_id: "sub_123",
        plan: "business",
        status: "active",
        billing_cycle: "monthly",
        current_period_start: "2024-01-01T00:00:00Z",
        current_period_end: "2024-02-01T00:00:00Z",
        cancel_at_period_end: false,
        canceled_at: null,
        trial_end: null,
        created_at: null,
        updated_at: null,
      });

      const { chain } = mockSupabase();
      chain.single.mockResolvedValue({
        data: {
          id: "usage-1",
          posts_count: 0,
          ai_requests_count: 0,
          insights_count: 0,
          content_improvements_count: 0,
        },
        error: null,
      });

      const result = await canPerformAction(TEST_USER_ID, "trend_detection");
      expect(result.allowed).toBe(false);
      expect(result.upgrade_to).toBe("agency");
    });

    it("returns not allowed when no subscription", async () => {
      vi.mocked(getSubscriptionForUser).mockResolvedValue(null);

      const result = await canPerformAction(TEST_USER_ID, "create_post");
      expect(result.allowed).toBe(false);
    });
  });

  describe("getRemainingQuota", () => {
    it("returns remaining posts for starter", async () => {
      vi.mocked(getSubscriptionForUser).mockResolvedValue({
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
        created_at: null,
        updated_at: null,
      });

      const { chain } = mockSupabase();
      chain.single.mockResolvedValue({
        data: {
          id: "usage-1",
          posts_count: 12,
          ai_requests_count: 0,
          insights_count: 0,
          content_improvements_count: 0,
        },
        error: null,
      });

      const remaining = await getRemainingQuota(TEST_USER_ID, "posts");
      expect(remaining).toBe(18);
    });

    it("returns -1 for unlimited resources", async () => {
      vi.mocked(getSubscriptionForUser).mockResolvedValue({
        id: "sub-1",
        user_id: TEST_USER_ID,
        stripe_customer_id: "cus_123",
        stripe_subscription_id: "sub_123",
        plan: "agency",
        status: "active",
        billing_cycle: "monthly",
        current_period_start: "2024-01-01T00:00:00Z",
        current_period_end: "2024-02-01T00:00:00Z",
        cancel_at_period_end: false,
        canceled_at: null,
        trial_end: null,
        created_at: null,
        updated_at: null,
      });

      const { chain } = mockSupabase();
      chain.single.mockResolvedValue({
        data: {
          id: "usage-1",
          posts_count: 999,
          ai_requests_count: 0,
          insights_count: 0,
          content_improvements_count: 0,
        },
        error: null,
      });

      const remaining = await getRemainingQuota(TEST_USER_ID, "posts");
      expect(remaining).toBe(-1);
    });

    it("returns null when no subscription", async () => {
      vi.mocked(getSubscriptionForUser).mockResolvedValue(null);

      const remaining = await getRemainingQuota(TEST_USER_ID, "posts");
      expect(remaining).toBeNull();
    });
  });
});
