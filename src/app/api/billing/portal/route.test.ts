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

import { createClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe/client";
import { getSubscriptionForUser } from "@/lib/services/subscriptions";
import { POST } from "./route";

const TEST_USER = { id: "user-123", email: "test@example.com" };

describe("POST /api/billing/portal", () => {
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
      "http://localhost:3000/api/billing/portal",
      { method: "POST" }
    );
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("returns 404 when no subscription exists", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: TEST_USER }, error: null }),
      },
    } as never);
    vi.mocked(getSubscriptionForUser).mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost:3000/api/billing/portal",
      { method: "POST" }
    );
    const response = await POST(request);
    expect(response.status).toBe(404);
  });

  it("creates portal session and returns URL", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: TEST_USER }, error: null }),
      },
    } as never);
    vi.mocked(getSubscriptionForUser).mockResolvedValue({
      id: "sub-1",
      user_id: TEST_USER.id,
      stripe_customer_id: "cus_123",
      stripe_subscription_id: "sub_123",
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
    });

    const mockStripe = {
      billingPortal: {
        sessions: {
          create: vi
            .fn()
            .mockResolvedValue({ url: "https://billing.stripe.com/portal" }),
        },
      },
    };
    vi.mocked(getStripeClient).mockReturnValue(mockStripe as never);

    const request = new NextRequest(
      "http://localhost:3000/api/billing/portal",
      { method: "POST" }
    );
    const response = await POST(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.url).toBe("https://billing.stripe.com/portal");
  });

  it("returns 500 with detail when Stripe portal creation fails", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: TEST_USER }, error: null }),
      },
    } as never);
    vi.mocked(getSubscriptionForUser).mockResolvedValue({
      id: "sub-1",
      user_id: TEST_USER.id,
      stripe_customer_id: "cus_123",
    } as never);

    const mockStripe = {
      billingPortal: {
        sessions: {
          create: vi.fn().mockRejectedValue(new Error("Portal not configured")),
        },
      },
    };
    vi.mocked(getStripeClient).mockReturnValue(mockStripe as never);

    const request = new NextRequest(
      "http://localhost:3000/api/billing/portal",
      { method: "POST" }
    );
    const response = await POST(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Failed to create portal session");
    expect(data.detail).toBe("Portal not configured");
  });

  it("returns 500 with detail when subscription lookup fails", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: TEST_USER }, error: null }),
      },
    } as never);
    vi.mocked(getSubscriptionForUser).mockRejectedValue(
      new Error("DB timeout")
    );

    const request = new NextRequest(
      "http://localhost:3000/api/billing/portal",
      { method: "POST" }
    );
    const response = await POST(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.detail).toBe("DB timeout");
  });
});
