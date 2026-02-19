import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe/client";
import { upgradeSchema } from "@/lib/validators/billing";
import { getPriceId, ACTIVE_STATUSES, type SubscriptionStatus } from "@/lib/stripe/plans";
import { getSubscriptionForUser } from "@/lib/services/subscriptions";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = upgradeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { plan, billing_cycle } = parsed.data;

  try {
    const existingSub = await getSubscriptionForUser(user.id);

    if (
      !existingSub ||
      !existingSub.stripe_subscription_id ||
      !ACTIVE_STATUSES.includes(existingSub.status as SubscriptionStatus)
    ) {
      return NextResponse.json(
        { error: "No active subscription found. Use checkout to subscribe." },
        { status: 400 }
      );
    }

    if (existingSub.plan === plan && existingSub.billing_cycle === billing_cycle) {
      return NextResponse.json(
        { error: `You are already on the ${plan} ${billing_cycle} plan.` },
        { status: 400 }
      );
    }

    const stripe = getStripeClient();
    const priceId = getPriceId(plan, billing_cycle);

    const stripeSubscription = await stripe.subscriptions.retrieve(
      existingSub.stripe_subscription_id
    );

    const currentItemId = stripeSubscription.items.data[0].id;

    await stripe.subscriptions.update(existingSub.stripe_subscription_id, {
      items: [{ id: currentItemId, price: priceId }],
      proration_behavior: "create_prorations",
      metadata: { user_id: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[POST /api/billing/upgrade]", message, err);
    return NextResponse.json(
      { error: "Failed to update subscription", detail: message },
      { status: 500 }
    );
  }
}
