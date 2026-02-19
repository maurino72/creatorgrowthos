import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe/client";
import { getSubscriptionForUser } from "@/lib/services/subscriptions";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const subscription = await getSubscriptionForUser(user.id);
    if (!subscription?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No subscription found" },
        { status: 404 }
      );
    }

    const stripe = getStripeClient();

    const stripeInvoices = await stripe.invoices.list({
      customer: subscription.stripe_customer_id,
      limit: 24,
    });

    const invoices = stripeInvoices.data.map((inv) => ({
      id: inv.id,
      amount: inv.amount_paid,
      currency: inv.currency,
      status: inv.status,
      invoice_url: inv.hosted_invoice_url,
      invoice_pdf: inv.invoice_pdf,
      period_start: inv.period_start
        ? new Date(inv.period_start * 1000).toISOString()
        : null,
      period_end: inv.period_end
        ? new Date(inv.period_end * 1000).toISOString()
        : null,
      created_at: inv.created
        ? new Date(inv.created * 1000).toISOString()
        : null,
    }));

    return NextResponse.json({ invoices });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[GET /api/billing/invoices]", message, err);
    return NextResponse.json(
      { error: "Failed to fetch invoices", detail: message },
      { status: 500 }
    );
  }
}
