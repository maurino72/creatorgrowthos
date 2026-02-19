import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (stripeInstance) return stripeInstance;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }

  stripeInstance = new Stripe(key, {
    apiVersion: "2026-01-28.clover",
    typescript: true,
  });

  return stripeInstance;
}
