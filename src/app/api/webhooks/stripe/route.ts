import { NextRequest, NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe/client";
import { upsertSubscription } from "@/lib/services/subscriptions";
import type Stripe from "stripe";

const PRICE_TO_PLAN: Record<string, string> = {
  [process.env.STRIPE_STARTER_MONTHLY_PRICE_ID ?? ""]: "starter",
  [process.env.STRIPE_STARTER_YEARLY_PRICE_ID ?? ""]: "starter",
  [process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID ?? ""]: "business",
  [process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID ?? ""]: "business",
  [process.env.STRIPE_AGENCY_MONTHLY_PRICE_ID ?? ""]: "agency",
  [process.env.STRIPE_AGENCY_YEARLY_PRICE_ID ?? ""]: "agency",
};

function resolvePlan(priceId: string): string {
  return PRICE_TO_PLAN[priceId] ?? "starter";
}

function resolveBillingCycle(interval: string): string {
  return interval === "year" ? "yearly" : "monthly";
}

function timestampToISO(ts: number | null | undefined): string | null {
  if (!ts) return null;
  return new Date(ts * 1000).toISOString();
}

async function handleSubscriptionEvent(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.user_id;
  if (!userId) return;

  const item = subscription.items.data[0];
  const priceId = item?.price?.id ?? "";
  const interval = item?.price?.recurring?.interval ?? "month";

  await upsertSubscription(userId, {
    stripe_customer_id: subscription.customer as string,
    stripe_subscription_id: subscription.id,
    plan: resolvePlan(priceId),
    status: subscription.status,
    billing_cycle: resolveBillingCycle(interval),
    current_period_start: timestampToISO(subscription.current_period_start),
    current_period_end: timestampToISO(subscription.current_period_end),
    cancel_at_period_end: subscription.cancel_at_period_end,
    canceled_at: timestampToISO(subscription.canceled_at),
    trial_end: timestampToISO(subscription.trial_end),
  });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  if (!userId) return;

  const stripe = getStripeClient();
  if (session.subscription) {
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    );
    await handleSubscriptionEvent(subscription);
  }
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  const body = await request.text();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret!
    ) as Stripe.Event;
  } catch {
    return NextResponse.json(
      { error: "Invalid signature verification" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscriptionEvent(
          event.data.object as Stripe.Subscription
        );
        break;

      case "invoice.payment_failed": {
        // payment_failed is handled through subscription.updated webhook
        // which fires with status=past_due after invoice failure
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error(`Webhook handler error for ${event.type}:`, err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
