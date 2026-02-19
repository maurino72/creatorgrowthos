import { describe, it, expect, vi, beforeEach } from "vitest";

describe("stripe client", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("exports getStripeClient function", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
    const mod = await import("./client");
    expect(typeof mod.getStripeClient).toBe("function");
  });

  it("returns a Stripe instance", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
    const { getStripeClient } = await import("./client");
    const stripe = getStripeClient();
    expect(stripe).toBeDefined();
    expect(typeof stripe.customers).toBe("object");
  });

  it("returns the same instance on subsequent calls (singleton)", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
    const { getStripeClient } = await import("./client");
    const a = getStripeClient();
    const b = getStripeClient();
    expect(a).toBe(b);
  });

  it("throws if STRIPE_SECRET_KEY is not set", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    const { getStripeClient } = await import("./client");
    expect(() => getStripeClient()).toThrow("STRIPE_SECRET_KEY");
  });
});
