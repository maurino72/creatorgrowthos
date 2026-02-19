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
  upsertSubscription: vi.fn(),
}));

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
    customers: {
      create: vi.fn().mockResolvedValue({ id: "cus_new" }),
    },
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({
          url: "https://checkout.stripe.com/session_123",
        }),
      },
    },
  };
  vi.mocked(getStripeClient).mockReturnValue(mockStripeInstance as never);
  return mockStripeInstance;
}

function createRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/billing/checkout", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/billing/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as never);

    const response = await POST(
      createRequest({ plan: "starter", billing_cycle: "monthly" })
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
      createRequest({ plan: "starter", billing_cycle: "weekly" })
    );
    expect(response.status).toBe(400);
  });

  it("creates checkout session with trial for new customer", async () => {
    mockAuth();
    const stripe = mockStripe();
    vi.mocked(getSubscriptionForUser).mockResolvedValue(null);

    const response = await POST(
      createRequest({ plan: "starter", billing_cycle: "monthly" })
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.url).toBe("https://checkout.stripe.com/session_123");
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        subscription_data: expect.objectContaining({
          trial_period_days: 14,
        }),
      })
    );
  });

  it("uses existing stripe customer ID", async () => {
    mockAuth();
    const stripe = mockStripe();
    vi.mocked(getSubscriptionForUser).mockResolvedValue({
      id: "sub-1",
      user_id: TEST_USER.id,
      stripe_customer_id: "cus_existing",
      stripe_subscription_id: null,
      plan: "starter",
      status: "canceled",
      billing_cycle: "monthly",
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
      canceled_at: null,
      trial_end: null,
      created_at: null,
      updated_at: null,
    });

    const response = await POST(
      createRequest({ plan: "business", billing_cycle: "yearly" })
    );

    expect(response.status).toBe(200);
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_existing",
      })
    );
  });

  it("returns 500 with detail when Stripe customer creation fails", async () => {
    mockAuth();
    const stripe = mockStripe();
    vi.mocked(getSubscriptionForUser).mockResolvedValue(null);
    stripe.customers.create.mockRejectedValue(new Error("Stripe rate limit exceeded"));

    const response = await POST(
      createRequest({ plan: "starter", billing_cycle: "monthly" })
    );

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Failed to create checkout session");
    expect(data.detail).toBe("Stripe rate limit exceeded");
  });

  it("returns 500 with detail when checkout session creation fails", async () => {
    mockAuth();
    const stripe = mockStripe();
    vi.mocked(getSubscriptionForUser).mockResolvedValue({
      id: "sub-1",
      user_id: TEST_USER.id,
      stripe_customer_id: "cus_existing",
    } as never);
    stripe.checkout.sessions.create.mockRejectedValue(
      new Error("Invalid price ID")
    );

    const response = await POST(
      createRequest({ plan: "starter", billing_cycle: "monthly" })
    );

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Failed to create checkout session");
    expect(data.detail).toBe("Invalid price ID");
  });

  it("returns 500 with detail when subscription lookup fails", async () => {
    mockAuth();
    mockStripe();
    vi.mocked(getSubscriptionForUser).mockRejectedValue(
      new Error("Database connection failed")
    );

    const response = await POST(
      createRequest({ plan: "starter", billing_cycle: "monthly" })
    );

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.detail).toBe("Database connection failed");
  });
});
