import { z } from "zod";

export const PLANS = ["starter", "business", "agency"] as const;
export type PlanType = (typeof PLANS)[number];

export const BILLING_CYCLES = ["monthly", "yearly"] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

export const planSchema = z.enum(PLANS);
export const billingCycleSchema = z.enum(BILLING_CYCLES);

export type PlanLimits = {
  posts_per_month: number;
  scheduled_posts: number;
  drafts: number;
  platforms: number;
  ai_improvements: number;
  insights: number;
  content_import: number;
  historical_data_days: number;
};

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  starter: {
    posts_per_month: 30,
    scheduled_posts: 10,
    drafts: 20,
    platforms: 1,
    ai_improvements: 5,
    insights: 5,
    content_import: 0,
    historical_data_days: 30,
  },
  business: {
    posts_per_month: 100,
    scheduled_posts: 50,
    drafts: -1,
    platforms: 3,
    ai_improvements: -1,
    insights: -1,
    content_import: 500,
    historical_data_days: 365,
  },
  agency: {
    posts_per_month: -1,
    scheduled_posts: -1,
    drafts: -1,
    platforms: -1,
    ai_improvements: -1,
    insights: -1,
    content_import: -1,
    historical_data_days: -1,
  },
};

export type PlanPricing = {
  monthly: number;
  yearly: number;
  monthly_equivalent_yearly: number;
  yearly_savings: number;
};

export const PLAN_PRICING: Record<PlanType, PlanPricing> = {
  starter: {
    monthly: 19,
    yearly: 190,
    monthly_equivalent_yearly: 15.83,
    yearly_savings: 38,
  },
  business: {
    monthly: 49,
    yearly: 490,
    monthly_equivalent_yearly: 40.83,
    yearly_savings: 98,
  },
  agency: {
    monthly: 99,
    yearly: 990,
    monthly_equivalent_yearly: 82.5,
    yearly_savings: 198,
  },
};

const PRICE_IDS: Record<PlanType, Record<BillingCycle, string>> = {
  starter: {
    monthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID ?? "",
    yearly: process.env.STRIPE_STARTER_YEARLY_PRICE_ID ?? "",
  },
  business: {
    monthly: process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID ?? "",
    yearly: process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID ?? "",
  },
  agency: {
    monthly: process.env.STRIPE_AGENCY_MONTHLY_PRICE_ID ?? "",
    yearly: process.env.STRIPE_AGENCY_YEARLY_PRICE_ID ?? "",
  },
};

export function getPlanLimits(plan: PlanType): PlanLimits {
  return PLAN_LIMITS[plan];
}

export function getPriceId(plan: PlanType, cycle: BillingCycle): string {
  return PRICE_IDS[plan][cycle];
}

export function getUpgradePath(plan: PlanType): PlanType | null {
  if (plan === "starter") return "business";
  if (plan === "business") return "agency";
  return null;
}

export function isValidPlan(value: string): value is PlanType {
  return PLANS.includes(value as PlanType);
}

export function isValidBillingCycle(value: string): value is BillingCycle {
  return BILLING_CYCLES.includes(value as BillingCycle);
}

const PLAN_DISPLAY_NAMES: Record<PlanType, string> = {
  starter: "Starter",
  business: "Business",
  agency: "Agency",
};

const PLAN_DESCRIPTIONS: Record<PlanType, string> = {
  starter: "Perfect for getting started",
  business: "For serious multi-platform creators",
  agency: "Unlimited power for agencies",
};

export function getPlanDisplayName(plan: PlanType): string {
  return PLAN_DISPLAY_NAMES[plan];
}

export function getPlanDescription(plan: PlanType): string {
  return PLAN_DESCRIPTIONS[plan];
}

export const TRIAL_PERIOD_DAYS = 14;

export type SubscriptionStatus =
  | "active"
  | "canceled"
  | "past_due"
  | "trialing"
  | "unpaid"
  | "incomplete";

export const ACTIVE_STATUSES: SubscriptionStatus[] = [
  "active",
  "trialing",
  "past_due",
];
