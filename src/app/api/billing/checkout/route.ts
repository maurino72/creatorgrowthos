import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe/client";
import { checkoutSchema } from "@/lib/validators/billing";
import { getPriceId, TRIAL_PERIOD_DAYS } from "@/lib/stripe/plans";
import {
  getSubscriptionForUser,
  upsertSubscription,
} from "@/lib/services/subscriptions";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = checkoutSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { plan, billing_cycle } = parsed.data;

  try {
    const priceId = getPriceId(plan, billing_cycle);
    const stripe = getStripeClient();

    // Get or create Stripe customer
    let customerId: string;
    const existingSub = await getSubscriptionForUser(user.id);

    if (existingSub?.stripe_customer_id) {
      customerId = existingSub.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;

      await upsertSubscription(user.id, {
        stripe_customer_id: customerId,
        plan,
        status: "incomplete",
        billing_cycle,
      });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: TRIAL_PERIOD_DAYS,
        metadata: { user_id: user.id },
      },
      success_url: `${appUrl}/dashboard?checkout=success`,
      cancel_url: `${appUrl}/pricing?checkout=canceled`,
      metadata: { user_id: user.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[POST /api/billing/checkout]", message, err);
    return NextResponse.json(
      { error: "Failed to create checkout session", detail: message },
      { status: 500 }
    );
  }
}
