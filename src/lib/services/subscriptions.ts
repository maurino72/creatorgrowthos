import { createAdminClient } from "@/lib/supabase/admin";
import type { SubscriptionStatus } from "@/lib/stripe/plans";

const ACTIVE_STATUSES: SubscriptionStatus[] = [
  "active",
  "trialing",
  "past_due",
];

export async function getSubscriptionForUser(userId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data ?? null;
}

export interface UpsertSubscriptionData {
  stripe_customer_id: string;
  stripe_subscription_id?: string | null;
  plan: string;
  status: string;
  billing_cycle: string;
  current_period_start?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
  canceled_at?: string | null;
  trial_end?: string | null;
}

export async function upsertSubscription(
  userId: string,
  data: UpsertSubscriptionData
) {
  const supabase = createAdminClient();

  const { data: result, error } = await supabase
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        ...data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) throw new Error(error.message);
  return result;
}

export async function isSubscriptionActive(userId: string): Promise<boolean> {
  const subscription = await getSubscriptionForUser(userId);
  if (!subscription) return false;

  const status = subscription.status as SubscriptionStatus;

  if (ACTIVE_STATUSES.includes(status)) return true;

  if (
    status === "canceled" &&
    subscription.current_period_end &&
    new Date(subscription.current_period_end) > new Date()
  ) {
    return true;
  }

  return false;
}
