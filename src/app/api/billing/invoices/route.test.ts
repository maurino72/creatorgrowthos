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
import { GET } from "./route";

const TEST_USER = { id: "user-123", email: "test@example.com" };

describe("GET /api/billing/invoices", () => {
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
      "http://localhost:3000/api/billing/invoices"
    );
    const response = await GET(request);
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
      "http://localhost:3000/api/billing/invoices"
    );
    const response = await GET(request);
    expect(response.status).toBe(404);
  });

  it("returns invoices from Stripe", async () => {
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

    const mockInvoices = {
      data: [
        {
          id: "inv_1",
          amount_paid: 1900,
          currency: "usd",
          status: "paid",
          hosted_invoice_url: "https://invoice.stripe.com/inv_1",
          invoice_pdf: "https://invoice.stripe.com/inv_1/pdf",
          period_start: 1704067200,
          period_end: 1706745600,
          created: 1704067200,
        },
      ],
    };

    const mockStripe = {
      invoices: {
        list: vi.fn().mockResolvedValue(mockInvoices),
      },
    };
    vi.mocked(getStripeClient).mockReturnValue(mockStripe as never);

    const request = new NextRequest(
      "http://localhost:3000/api/billing/invoices"
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.invoices).toHaveLength(1);
    expect(data.invoices[0].amount).toBe(1900);
    expect(data.invoices[0].status).toBe("paid");
  });

  it("returns 500 with detail when Stripe API fails", async () => {
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
      invoices: {
        list: vi.fn().mockRejectedValue(new Error("No such customer: cus_123")),
      },
    };
    vi.mocked(getStripeClient).mockReturnValue(mockStripe as never);

    const request = new NextRequest(
      "http://localhost:3000/api/billing/invoices"
    );
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Failed to fetch invoices");
    expect(data.detail).toBe("No such customer: cus_123");
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
      new Error("DB connection refused")
    );

    const request = new NextRequest(
      "http://localhost:3000/api/billing/invoices"
    );
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.detail).toBe("DB connection refused");
  });
});
