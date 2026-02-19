import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("./subscriptions", () => ({
  getSubscriptionForUser: vi.fn(),
}));

import { getSubscriptionForUser } from "./subscriptions";
import { createAdminClient } from "@/lib/supabase/admin";
import { canPerformAction } from "./usage";

function mockSupabase() {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    data: null as unknown,
    error: null as unknown,
  };

  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.gte.mockReturnValue(chain);
  chain.lte.mockReturnValue(chain);
  chain.upsert.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);

  const from = vi.fn().mockReturnValue(chain);
  vi.mocked(createAdminClient).mockReturnValue({ from } as never);

  return { from, chain };
}

const TEST_USER_ID = "user-123";
const mockSubscription = (plan: string) => ({
  id: "sub-1",
  user_id: TEST_USER_ID,
  stripe_customer_id: "cus_123",
  stripe_subscription_id: "sub_123",
  plan,
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

describe("usage enforcement integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starter: blocks at 30 posts", async () => {
    vi.mocked(getSubscriptionForUser).mockResolvedValue(mockSubscription("starter"));
    const { chain } = mockSupabase();
    chain.single.mockResolvedValue({
      data: { id: "u1", posts_count: 30, ai_requests_count: 0, insights_count: 0, content_improvements_count: 0 },
      error: null,
    });

    const result = await canPerformAction(TEST_USER_ID, "create_post");
    expect(result.allowed).toBe(false);
    expect(result.upgrade_to).toBe("business");
  });

  it("starter: allows at 29 posts", async () => {
    vi.mocked(getSubscriptionForUser).mockResolvedValue(mockSubscription("starter"));
    const { chain } = mockSupabase();
    chain.single.mockResolvedValue({
      data: { id: "u1", posts_count: 29, ai_requests_count: 0, insights_count: 0, content_improvements_count: 0 },
      error: null,
    });

    const result = await canPerformAction(TEST_USER_ID, "create_post");
    expect(result.allowed).toBe(true);
  });

  it("business: blocks at 100 posts", async () => {
    vi.mocked(getSubscriptionForUser).mockResolvedValue(mockSubscription("business"));
    const { chain } = mockSupabase();
    chain.single.mockResolvedValue({
      data: { id: "u1", posts_count: 100, ai_requests_count: 0, insights_count: 0, content_improvements_count: 0 },
      error: null,
    });

    const result = await canPerformAction(TEST_USER_ID, "create_post");
    expect(result.allowed).toBe(false);
    expect(result.upgrade_to).toBe("agency");
  });

  it("agency: never blocks posts", async () => {
    vi.mocked(getSubscriptionForUser).mockResolvedValue(mockSubscription("agency"));
    const { chain } = mockSupabase();
    chain.single.mockResolvedValue({
      data: { id: "u1", posts_count: 999, ai_requests_count: 0, insights_count: 0, content_improvements_count: 0 },
      error: null,
    });

    const result = await canPerformAction(TEST_USER_ID, "create_post");
    expect(result.allowed).toBe(true);
  });

  it("starter: blocks AI improvement at 5", async () => {
    vi.mocked(getSubscriptionForUser).mockResolvedValue(mockSubscription("starter"));
    const { chain } = mockSupabase();
    chain.single.mockResolvedValue({
      data: { id: "u1", posts_count: 0, ai_requests_count: 0, insights_count: 0, content_improvements_count: 5 },
      error: null,
    });

    const result = await canPerformAction(TEST_USER_ID, "ai_improvement");
    expect(result.allowed).toBe(false);
    expect(result.upgrade_to).toBe("business");
  });

  it("starter: blocks ideation (feature gated)", async () => {
    vi.mocked(getSubscriptionForUser).mockResolvedValue(mockSubscription("starter"));
    const { chain } = mockSupabase();
    chain.single.mockResolvedValue({
      data: { id: "u1", posts_count: 0, ai_requests_count: 0, insights_count: 0, content_improvements_count: 0 },
      error: null,
    });

    const result = await canPerformAction(TEST_USER_ID, "ideation");
    expect(result.allowed).toBe(false);
  });

  it("business: allows ideation", async () => {
    vi.mocked(getSubscriptionForUser).mockResolvedValue(mockSubscription("business"));
    const { chain } = mockSupabase();
    chain.single.mockResolvedValue({
      data: { id: "u1", posts_count: 0, ai_requests_count: 0, insights_count: 0, content_improvements_count: 0 },
      error: null,
    });

    const result = await canPerformAction(TEST_USER_ID, "ideation");
    expect(result.allowed).toBe(true);
  });

  it("business: blocks trend detection (agency only)", async () => {
    vi.mocked(getSubscriptionForUser).mockResolvedValue(mockSubscription("business"));
    const { chain } = mockSupabase();
    chain.single.mockResolvedValue({
      data: { id: "u1", posts_count: 0, ai_requests_count: 0, insights_count: 0, content_improvements_count: 0 },
      error: null,
    });

    const result = await canPerformAction(TEST_USER_ID, "trend_detection");
    expect(result.allowed).toBe(false);
    expect(result.upgrade_to).toBe("agency");
  });
});
