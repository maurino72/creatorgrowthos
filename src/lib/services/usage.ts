import { createAdminClient } from "@/lib/supabase/admin";
import { getPlanLimits, getUpgradePath, canAccessPlatform, type PlanType } from "@/lib/stripe/plans";
import type { PlatformType } from "@/lib/adapters/types";
import { getSubscriptionForUser } from "./subscriptions";
import { getConnectionsForUser } from "./connections";

type UsageField =
  | "posts_count"
  | "ai_requests_count"
  | "insights_count"
  | "content_improvements_count";

type ActionType =
  | "create_post"
  | "schedule_post"
  | "save_draft"
  | "connect_platform"
  | "ai_improvement"
  | "insight"
  | "ideation"
  | "content_import"
  | "export_data"
  | "trend_detection";

type ResourceType = "posts" | "ai_improvements" | "insights";

export interface ActionResult {
  allowed: boolean;
  upgrade_to?: string | null;
  reason?: string;
}

export interface UsageData {
  posts_used: number;
  posts_limit: number;
  ai_improvements_used: number;
  ai_improvements_limit: number;
  insights_used: number;
  insights_limit: number;
  period_end: string | null;
}

export async function getOrCreateUsagePeriod(
  userId: string,
  periodStart: string,
  periodEnd: string
) {
  const supabase = createAdminClient();

  // ignoreDuplicates: true means existing rows return 0 rows,
  // so we use maybeSingle and fall back to a select if needed
  const { data, error } = await supabase
    .from("usage_tracking")
    .upsert(
      {
        user_id: userId,
        period_start: periodStart,
        period_end: periodEnd,
        posts_count: 0,
        ai_requests_count: 0,
        insights_count: 0,
        content_improvements_count: 0,
      },
      { onConflict: "user_id,period_start", ignoreDuplicates: true }
    )
    .select()
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (data) return data;

  // Row already existed — fetch it
  const { data: existing, error: fetchError } = await supabase
    .from("usage_tracking")
    .select()
    .eq("user_id", userId)
    .eq("period_start", periodStart)
    .single();

  if (fetchError) throw new Error(fetchError.message);
  return existing;
}

async function getUsageForSubscription(userId: string, subscription: NonNullable<Awaited<ReturnType<typeof getSubscriptionForUser>>>) {
  const periodStart = subscription.current_period_start?.split("T")[0] ?? new Date().toISOString().split("T")[0];
  const periodEnd = subscription.current_period_end?.split("T")[0] ?? new Date().toISOString().split("T")[0];
  return getOrCreateUsagePeriod(userId, periodStart, periodEnd);
}

export async function incrementUsage(userId: string, field: UsageField) {
  const subscription = await getSubscriptionForUser(userId);
  if (!subscription) throw new Error("No active subscription");

  const usage = await getUsageForSubscription(userId, subscription);

  const supabase = createAdminClient();
  const currentValue = (usage as unknown as Record<string, number>)[field] ?? 0;

  const { data, error } = await supabase
    .from("usage_tracking")
    .update({
      [field]: currentValue + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", usage.id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getUserUsage(userId: string): Promise<UsageData | null> {
  const subscription = await getSubscriptionForUser(userId);
  if (!subscription) return null;

  const usage = await getUsageForSubscription(userId, subscription);
  const limits = getPlanLimits(subscription.plan as PlanType);

  return {
    posts_used: usage.posts_count,
    posts_limit: limits.posts_per_month,
    ai_improvements_used: usage.content_improvements_count,
    ai_improvements_limit: limits.ai_improvements,
    insights_used: usage.insights_count,
    insights_limit: limits.insights,
    period_end: subscription.current_period_end,
  };
}

const FEATURE_GATING: Record<string, PlanType[]> = {
  ideation: ["business", "agency"],
  content_import: ["business", "agency"],
  export_data: ["business", "agency"],
  trend_detection: ["agency"],
};

const ACTION_TO_USAGE_FIELD: Record<string, { field: UsageField; limitKey: keyof ReturnType<typeof getPlanLimits> }> = {
  create_post: { field: "posts_count", limitKey: "posts_per_month" },
  ai_improvement: { field: "content_improvements_count", limitKey: "ai_improvements" },
  insight: { field: "insights_count", limitKey: "insights" },
};

export async function canPerformAction(
  userId: string,
  action: ActionType
): Promise<ActionResult> {
  const subscription = await getSubscriptionForUser(userId);
  if (!subscription) return { allowed: false, reason: "No subscription" };

  const plan = subscription.plan as PlanType;

  // Check feature gating first
  const allowedPlans = FEATURE_GATING[action];
  if (allowedPlans && !allowedPlans.includes(plan)) {
    return {
      allowed: false,
      upgrade_to: getUpgradePath(plan),
      reason: `${action} requires ${allowedPlans[0]} plan or higher`,
    };
  }

  // Check usage-based limits
  const mapping = ACTION_TO_USAGE_FIELD[action];
  if (mapping) {
    const limits = getPlanLimits(plan);
    const limit = limits[mapping.limitKey];

    // Unlimited
    if (limit === -1) return { allowed: true };

    const usage = await getUsageForSubscription(userId, subscription);
    const currentCount = (usage as unknown as Record<string, number>)[mapping.field] ?? 0;

    if (currentCount >= limit) {
      return {
        allowed: false,
        upgrade_to: getUpgradePath(plan),
        reason: `${action} limit reached (${currentCount}/${limit})`,
      };
    }
  }

  return { allowed: true };
}

export async function getRemainingQuota(
  userId: string,
  resource: ResourceType
): Promise<number | null> {
  const subscription = await getSubscriptionForUser(userId);
  if (!subscription) return null;

  const plan = subscription.plan as PlanType;
  const limits = getPlanLimits(plan);

  const resourceMapping: Record<ResourceType, { field: UsageField; limitKey: keyof typeof limits }> = {
    posts: { field: "posts_count", limitKey: "posts_per_month" },
    ai_improvements: { field: "content_improvements_count", limitKey: "ai_improvements" },
    insights: { field: "insights_count", limitKey: "insights" },
  };

  const mapping = resourceMapping[resource];
  const limit = limits[mapping.limitKey];

  // Unlimited
  if (limit === -1) return -1;

  const usage = await getUsageForSubscription(userId, subscription);
  const currentCount = (usage as unknown as Record<string, number>)[mapping.field] ?? 0;

  return Math.max(0, limit - currentCount);
}

export async function canConnectPlatform(
  userId: string,
  platform: PlatformType,
): Promise<ActionResult> {
  const subscription = await getSubscriptionForUser(userId);
  if (!subscription) return { allowed: false, reason: "No subscription" };

  const plan = subscription.plan as PlanType;

  // Check platform access based on plan
  if (!canAccessPlatform(plan, platform)) {
    return {
      allowed: false,
      upgrade_to: getUpgradePath(plan),
      reason: `${platform} requires Business plan or higher`,
    };
  }

  // Check platform count limit
  const limits = getPlanLimits(plan);
  if (limits.platforms !== -1) {
    const connections = await getConnectionsForUser(userId);
    const activeConnections = connections.filter(
      (c) => c.status === "active",
    );

    // Don't count against limit if reconnecting an existing platform
    const isReconnect = connections.some((c) => c.platform === platform);
    if (!isReconnect && activeConnections.length >= limits.platforms) {
      return {
        allowed: false,
        upgrade_to: getUpgradePath(plan),
        reason: `Platform connection limit reached (${activeConnections.length}/${limits.platforms})`,
      };
    }
  }

  return { allowed: true };
}
