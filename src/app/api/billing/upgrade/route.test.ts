import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/stripe/client", () => ({
  getStripeClient: vi.fn(),
}));

vi.mock("@/lib/services/subscriptions", () => ({
  getSubscriptionForUser: vi.fn(),
}));

vi.mock("@/lib/stripe/plans", async () => {
  const actual = await vi.importActual("@/lib/stripe/plans");
  return {
    ...actual,
    getPriceId: vi.fn().mockReturnValue("price_new_123"),
  };
});

import { createClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe/client";
import { getSubscriptionForUser } from "@/lib/services/subscriptions";
import { POST } from "./route";

const TEST_USER = { id: "user-123", email: "test@example.com" };

function mockAuth(user = TEST_USER) {
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
  } as never);
}

function mockStripe() {
  const mockStripeInstance = {
    subscriptions: {
      retrieve: vi.fn().mockResolvedValue({
        items: { data: [{ id: "si_item_123" }] },
      }),
      update: vi.fn().mockResolvedValue({ id: "sub_stripe_123" }),
    },
  };
  vi.mocked(getStripeClient).mockReturnValue(mockStripeInstance as never);
  return mockStripeInstance;
}

function createRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/billing/upgrade", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function mockActiveSub(overrides: Record<string, unknown> = {}) {
  const sub = {
    id: "sub-1",
    user_id: TEST_USER.id,
    stripe_customer_id: "cus_existing",
    stripe_subscription_id: "sub_stripe_123",
    plan: "starter",
    status: "active",
    billing_cycle: "monthly",
    current_period_start: null,
    current_period_end: null,
    cancel_at_period_end: false,
    canceled_at: null,
    trial_end: null,
    created_at: null,
    updated_at: null,
    ...overrides,
  };
  vi.mocked(getSubscriptionForUser).mockResolvedValue(sub);
  return sub;
}

describe("POST /api/billing/upgrade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as never);

    const response = await POST(
      createRequest({ plan: "business", billing_cycle: "monthly" })
    );
    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid plan", async () => {
    mockAuth();
    const response = await POST(
      createRequest({ plan: "free", billing_cycle: "monthly" })
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid billing cycle", async () => {
    mockAuth();
    const response = await POST(
      createRequest({ plan: "business", billing_cycle: "weekly" })
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 when no active subscription exists", async () => {
    mockAuth();
    vi.mocked(getSubscriptionForUser).mockResolvedValue(null);

    const response = await POST(
      createRequest({ plan: "business", billing_cycle: "monthly" })
    );
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("No active subscription");
  });

  it("returns 400 when subscription has no stripe_subscription_id", async () => {
    mockAuth();
    mockActiveSub({ stripe_subscription_id: null, status: "incomplete" });

    const response = await POST(
      createRequest({ plan: "business", billing_cycle: "monthly" })
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 when same plan and same billing cycle", async () => {
    mockAuth();
    mockActiveSub({ plan: "business", billing_cycle: "monthly" });

    const response = await POST(
      createRequest({ plan: "business", billing_cycle: "monthly" })
    );
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("already on");
  });

  it("upgrades from starter to business successfully", async () => {
    mockAuth();
    mockActiveSub({ plan: "starter", billing_cycle: "monthly" });
    const stripe = mockStripe();

    const response = await POST(
      createRequest({ plan: "business", billing_cycle: "monthly" })
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);

    expect(stripe.subscriptions.retrieve).toHaveBeenCalledWith(
      "sub_stripe_123"
    );
    expect(stripe.subscriptions.update).toHaveBeenCalledWith(
      "sub_stripe_123",
      expect.objectContaining({
        items: [{ id: "si_item_123", price: "price_new_123" }],
        proration_behavior: "create_prorations",
        metadata: { user_id: TEST_USER.id },
      })
    );
  });

  it("downgrades from business to starter successfully", async () => {
    mockAuth();
    mockActiveSub({ plan: "business", billing_cycle: "monthly" });
    const stripe = mockStripe();

    const response = await POST(
      createRequest({ plan: "starter", billing_cycle: "monthly" })
    );

    expect(response.status).toBe(200);
    expect(stripe.subscriptions.update).toHaveBeenCalled();
  });

  it("changes billing cycle (monthly → yearly) for same plan", async () => {
    mockAuth();
    mockActiveSub({ plan: "starter", billing_cycle: "monthly" });
    const stripe = mockStripe();

    const response = await POST(
      createRequest({ plan: "starter", billing_cycle: "yearly" })
    );

    expect(response.status).toBe(200);
    expect(stripe.subscriptions.update).toHaveBeenCalled();
  });

  it("returns 500 on Stripe failure", async () => {
    mockAuth();
    mockActiveSub({ plan: "starter", billing_cycle: "monthly" });
    const stripe = mockStripe();
    stripe.subscriptions.retrieve.mockRejectedValue(
      new Error("Stripe API error")
    );

    const response = await POST(
      createRequest({ plan: "business", billing_cycle: "monthly" })
    );

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Failed to update subscription");
    expect(data.detail).toBe("Stripe API error");
  });
});
