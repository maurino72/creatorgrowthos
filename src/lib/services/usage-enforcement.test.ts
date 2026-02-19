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

// ---------------------------------------------------------------------------
// Supabase mock helpers — simulate real PostgREST behavior
// ---------------------------------------------------------------------------

/**
 * Creates a Supabase query chain that mirrors real PostgREST semantics:
 *
 * - `.single()` defaults to PGRST116 error (0 rows) — real Supabase behavior.
 * - `.maybeSingle()` defaults to `{ data: null, error: null }` — safe variant.
 *
 * Override per-test with `.mockResolvedValue()` / `.mockResolvedValueOnce()`.
 */
function createChain() {
  const chain = {
    select: vi.fn(),
    eq: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    single: vi.fn().mockResolvedValue({
      data: null,
      error: { code: "PGRST116", message: "Results contain 0 rows" },
    }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    upsert: vi.fn(),
    update: vi.fn(),
  };

  for (const m of ["select", "eq", "gte", "lte", "upsert", "update"]) {
    (chain as Record<string, ReturnType<typeof vi.fn>>)[m].mockReturnValue(chain);
  }

  return chain;
}

/**
 * Sets up `createAdminClient()` so that `getOrCreateUsagePeriod`'s upsert
 * returns usage data via `.maybeSingle()` (the "new row" happy path).
 */
function setupWithUsageData(usageData: Record<string, unknown>) {
  const chain = createChain();
  chain.maybeSingle.mockResolvedValue({ data: usageData, error: null });

  const from = vi.fn().mockReturnValue(chain);
  vi.mocked(createAdminClient).mockReturnValue({ from } as never);

  return { from, chain };
}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("usage enforcement integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starter: blocks at 30 posts", async () => {
    vi.mocked(getSubscriptionForUser).mockResolvedValue(mockSubscription("starter"));
    setupWithUsageData({
      id: "u1",
      posts_count: 30,
      ai_requests_count: 0,
      insights_count: 0,
      content_improvements_count: 0,
    });

    const result = await canPerformAction(TEST_USER_ID, "create_post");
    expect(result.allowed).toBe(false);
    expect(result.upgrade_to).toBe("business");
  });

  it("starter: allows at 29 posts", async () => {
    vi.mocked(getSubscriptionForUser).mockResolvedValue(mockSubscription("starter"));
    setupWithUsageData({
      id: "u1",
      posts_count: 29,
      ai_requests_count: 0,
      insights_count: 0,
      content_improvements_count: 0,
    });

    const result = await canPerformAction(TEST_USER_ID, "create_post");
    expect(result.allowed).toBe(true);
  });

  it("business: blocks at 100 posts", async () => {
    vi.mocked(getSubscriptionForUser).mockResolvedValue(mockSubscription("business"));
    setupWithUsageData({
      id: "u1",
      posts_count: 100,
      ai_requests_count: 0,
      insights_count: 0,
      content_improvements_count: 0,
    });

    const result = await canPerformAction(TEST_USER_ID, "create_post");
    expect(result.allowed).toBe(false);
    expect(result.upgrade_to).toBe("agency");
  });

  it("agency: never blocks posts", async () => {
    vi.mocked(getSubscriptionForUser).mockResolvedValue(mockSubscription("agency"));
    setupWithUsageData({
      id: "u1",
      posts_count: 999,
      ai_requests_count: 0,
      insights_count: 0,
      content_improvements_count: 0,
    });

    const result = await canPerformAction(TEST_USER_ID, "create_post");
    expect(result.allowed).toBe(true);
  });

  it("starter: blocks AI improvement at 5", async () => {
    vi.mocked(getSubscriptionForUser).mockResolvedValue(mockSubscription("starter"));
    setupWithUsageData({
      id: "u1",
      posts_count: 0,
      ai_requests_count: 0,
      insights_count: 0,
      content_improvements_count: 5,
    });

    const result = await canPerformAction(TEST_USER_ID, "ai_improvement");
    expect(result.allowed).toBe(false);
    expect(result.upgrade_to).toBe("business");
  });

  it("starter: blocks ideation (feature gated)", async () => {
    vi.mocked(getSubscriptionForUser).mockResolvedValue(mockSubscription("starter"));
    setupWithUsageData({
      id: "u1",
      posts_count: 0,
      ai_requests_count: 0,
      insights_count: 0,
      content_improvements_count: 0,
    });

    const result = await canPerformAction(TEST_USER_ID, "ideation");
    expect(result.allowed).toBe(false);
  });

  it("business: allows ideation", async () => {
    vi.mocked(getSubscriptionForUser).mockResolvedValue(mockSubscription("business"));
    setupWithUsageData({
      id: "u1",
      posts_count: 0,
      ai_requests_count: 0,
      insights_count: 0,
      content_improvements_count: 0,
    });

    const result = await canPerformAction(TEST_USER_ID, "ideation");
    expect(result.allowed).toBe(true);
  });

  it("business: blocks trend detection (agency only)", async () => {
    vi.mocked(getSubscriptionForUser).mockResolvedValue(mockSubscription("business"));
    setupWithUsageData({
      id: "u1",
      posts_count: 0,
      ai_requests_count: 0,
      insights_count: 0,
      content_improvements_count: 0,
    });

    const result = await canPerformAction(TEST_USER_ID, "trend_detection");
    expect(result.allowed).toBe(false);
    expect(result.upgrade_to).toBe("agency");
  });
});
