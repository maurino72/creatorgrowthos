import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/services/subscriptions", () => ({
  getSubscriptionForUser: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { getSubscriptionForUser } from "@/lib/services/subscriptions";
import { GET } from "./route";

const TEST_USER = { id: "user-123", email: "test@example.com" };

describe("GET /api/billing/subscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as never);

    const request = new NextRequest(
      "http://localhost:3000/api/billing/subscription"
    );
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("returns null when no subscription exists", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: TEST_USER }, error: null }),
      },
    } as never);
    vi.mocked(getSubscriptionForUser).mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost:3000/api/billing/subscription"
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.subscription).toBeNull();
  });

  it("returns subscription data", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: TEST_USER }, error: null }),
      },
    } as never);

    const mockSub = {
      id: "sub-1",
      user_id: TEST_USER.id,
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
    };
    vi.mocked(getSubscriptionForUser).mockResolvedValue(mockSub);

    const request = new NextRequest(
      "http://localhost:3000/api/billing/subscription"
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.subscription.plan).toBe("business");
    expect(data.subscription.status).toBe("active");
  });

  it("returns 500 with detail when service throws", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: TEST_USER }, error: null }),
      },
    } as never);
    vi.mocked(getSubscriptionForUser).mockRejectedValue(
      new Error("relation \"subscriptions\" does not exist")
    );

    const request = new NextRequest(
      "http://localhost:3000/api/billing/subscription"
    );
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Failed to fetch subscription");
    expect(data.detail).toBe("relation \"subscriptions\" does not exist");
  });
});
