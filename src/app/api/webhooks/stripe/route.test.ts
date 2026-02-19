import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/stripe/client", () => ({
  getStripeClient: vi.fn(),
}));

vi.mock("@/lib/services/subscriptions", () => ({
  upsertSubscription: vi.fn(),
}));

import { getStripeClient } from "@/lib/stripe/client";
import { upsertSubscription } from "@/lib/services/subscriptions";
import { POST } from "./route";

function createMockStripe() {
  const mockStripe = {
    webhooks: {
      constructEvent: vi.fn(),
    },
    subscriptions: {
      retrieve: vi.fn().mockResolvedValue({
        id: "sub_123",
        customer: "cus_123",
        status: "trialing",
        items: {
          data: [
            {
              price: {
                id: "price_123",
                product: "prod_starter",
                recurring: { interval: "month" },
              },
            },
          ],
        },
        current_period_start: 1704067200,
        current_period_end: 1706745600,
        cancel_at_period_end: false,
        canceled_at: null,
        trial_end: 1705276800,
        metadata: { user_id: "user-123" },
      }),
    },
  };
  vi.mocked(getStripeClient).mockReturnValue(mockStripe as never);
  return mockStripe;
}

function createRequest(body: string, signature = "valid_sig") {
  return new NextRequest("http://localhost:3000/api/webhooks/stripe", {
    method: "POST",
    body,
    headers: {
      "stripe-signature": signature,
    },
  });
}

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test_123");
  });

  it("returns 400 when signature verification fails", async () => {
    const mockStripe = createMockStripe();
    mockStripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const request = createRequest('{"type":"test"}', "invalid_sig");
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("signature");
  });

  it("handles checkout.session.completed event", async () => {
    const mockStripe = createMockStripe();
    const event = {
      type: "checkout.session.completed",
      data: {
        object: {
          customer: "cus_123",
          subscription: "sub_123",
          metadata: { user_id: "user-123" },
        },
      },
    };
    mockStripe.webhooks.constructEvent.mockReturnValue(event);

    const request = createRequest(JSON.stringify(event));
    const response = await POST(request);

    expect(response.status).toBe(200);
  });

  it("handles customer.subscription.updated event", async () => {
    const mockStripe = createMockStripe();
    const event = {
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_123",
          customer: "cus_123",
          status: "active",
          items: {
            data: [
              {
                price: {
                  id: "price_123",
                  product: "prod_starter",
                  recurring: { interval: "month" },
                },
              },
            ],
          },
          current_period_start: 1704067200,
          current_period_end: 1706745600,
          cancel_at_period_end: false,
          canceled_at: null,
          trial_end: null,
          metadata: { user_id: "user-123" },
        },
      },
    };
    mockStripe.webhooks.constructEvent.mockReturnValue(event);

    const request = createRequest(JSON.stringify(event));
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(upsertSubscription).toHaveBeenCalled();
  });

  it("handles customer.subscription.deleted event", async () => {
    const mockStripe = createMockStripe();
    const event = {
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_123",
          customer: "cus_123",
          status: "canceled",
          items: {
            data: [
              {
                price: {
                  id: "price_123",
                  product: "prod_starter",
                  recurring: { interval: "month" },
                },
              },
            ],
          },
          current_period_start: 1704067200,
          current_period_end: 1706745600,
          cancel_at_period_end: false,
          canceled_at: 1705000000,
          trial_end: null,
          metadata: { user_id: "user-123" },
        },
      },
    };
    mockStripe.webhooks.constructEvent.mockReturnValue(event);

    const request = createRequest(JSON.stringify(event));
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(upsertSubscription).toHaveBeenCalled();
  });

  it("handles invoice.payment_failed event", async () => {
    const mockStripe = createMockStripe();
    const event = {
      type: "invoice.payment_failed",
      data: {
        object: {
          customer: "cus_123",
          subscription: "sub_123",
          metadata: {},
        },
      },
    };
    mockStripe.webhooks.constructEvent.mockReturnValue(event);

    const request = createRequest(JSON.stringify(event));
    const response = await POST(request);

    expect(response.status).toBe(200);
  });

  it("returns 200 for unknown event types", async () => {
    const mockStripe = createMockStripe();
    const event = {
      type: "some.unknown.event",
      data: { object: {} },
    };
    mockStripe.webhooks.constructEvent.mockReturnValue(event);

    const request = createRequest(JSON.stringify(event));
    const response = await POST(request);

    expect(response.status).toBe(200);
  });

  it("returns 400 when stripe-signature header is missing", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/webhooks/stripe",
      {
        method: "POST",
        body: '{"type":"test"}',
      }
    );

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
