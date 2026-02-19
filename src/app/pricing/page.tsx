"use client";

import { Fragment, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCheckout } from "@/lib/queries/billing";
import {
  PLANS,
  PLAN_PRICING,
  type PlanType,
  type BillingCycle,
  getPlanDisplayName,
  getPlanDescription,
} from "@/lib/stripe/plans";

/* ─── Plan feature highlights (shown in cards) ─── */
const PLAN_FEATURES: Record<PlanType, string[]> = {
  starter: [
    "1 platform",
    "30 posts/month",
    "10 scheduled posts",
    "20 drafts",
    "5 AI improvements/month",
    "Basic metrics (30 days)",
    "Post classification",
  ],
  business: [
    "3 platforms",
    "100 posts/month",
    "50 scheduled posts",
    "Unlimited drafts",
    "Full AI suite",
    "AI ideation & content plans",
    "1 year analytics history",
    "Content import (500 posts)",
    "Email support",
  ],
  agency: [
    "Unlimited platforms",
    "Unlimited posts",
    "Unlimited scheduling",
    "Unlimited drafts",
    "Priority AI processing",
    "Trend detection",
    "Unlimited analytics history",
    "CSV + API data export",
    "Priority support (24h)",
  ],
};

const PLAN_BADGES: Partial<Record<PlanType, string>> = {
  business: "Most Popular",
  agency: "Best Value",
};

/* ─── Detailed comparison table data ─── */
type ComparisonValue = string | boolean;

interface ComparisonCategory {
  category: string;
  rows: {
    feature: string;
    starter: ComparisonValue;
    business: ComparisonValue;
    agency: ComparisonValue;
  }[];
}

const COMPARISON_DATA: ComparisonCategory[] = [
  {
    category: "Content",
    rows: [
      { feature: "Posts per month", starter: "30", business: "100", agency: "Unlimited" },
      { feature: "Scheduled posts", starter: "10", business: "50", agency: "Unlimited" },
      { feature: "Drafts", starter: "20", business: "Unlimited", agency: "Unlimited" },
      { feature: "Image uploads per post", starter: "4", business: "4", agency: "4" },
    ],
  },
  {
    category: "Platforms",
    rows: [
      { feature: "Connected platforms", starter: "1", business: "3", agency: "Unlimited" },
      { feature: "Multi-platform publishing", starter: false, business: true, agency: true },
    ],
  },
  {
    category: "AI & Intelligence",
    rows: [
      { feature: "Post classification", starter: true, business: true, agency: true },
      { feature: "AI improvements", starter: "5/mo", business: "Unlimited", agency: "Unlimited" },
      { feature: "Content ideation", starter: false, business: true, agency: true },
      { feature: "Hashtag suggestions", starter: true, business: true, agency: true },
      { feature: "Experiment suggestions", starter: false, business: true, agency: true },
      { feature: "Trend detection", starter: false, business: false, agency: true },
      { feature: "Priority AI processing", starter: false, business: false, agency: true },
    ],
  },
  {
    category: "Analytics",
    rows: [
      { feature: "Metrics history", starter: "30 days", business: "1 year", agency: "Unlimited" },
      { feature: "Engagement tracking", starter: true, business: true, agency: true },
      { feature: "Weekly insights", starter: "5/mo", business: "Unlimited", agency: "Unlimited" },
      { feature: "Content import", starter: false, business: "500 posts", agency: "Unlimited" },
      { feature: "Data export (CSV + API)", starter: false, business: false, agency: true },
    ],
  },
  {
    category: "Support",
    rows: [
      { feature: "Community support", starter: true, business: true, agency: true },
      { feature: "Email support", starter: false, business: true, agency: true },
      { feature: "Priority support (24h)", starter: false, business: false, agency: true },
    ],
  },
];

/* ─── FAQ data ─── */
const FAQ_DATA = [
  {
    question: "How does the 14-day free trial work?",
    answer:
      "You get full access to your chosen plan for 14 days without any charge. No credit card is required upfront. If you decide it's not for you, simply cancel before the trial ends.",
  },
  {
    question: "Can I change my plan later?",
    answer:
      "Absolutely. You can upgrade or downgrade your plan at any time from your billing settings. When upgrading, you'll be prorated for the remaining time on your current billing period.",
  },
  {
    question: "What happens when I hit a usage limit?",
    answer:
      "You'll see a prompt suggesting an upgrade. Your existing content and data remain fully accessible — you just won't be able to create new posts beyond your limit until the next billing cycle.",
  },
  {
    question: "How does annual billing work?",
    answer:
      "Annual billing saves you up to 17% compared to monthly. You're billed once per year. If you cancel mid-year, you retain access until the end of your paid period.",
  },
];

/* ─── Sub-components ─── */

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-4 shrink-0", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function DashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-4 shrink-0", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ComparisonCell({ value }: { value: ComparisonValue }) {
  if (typeof value === "boolean") {
    return value ? (
      <CheckIcon className="text-primary" />
    ) : (
      <DashIcon className="text-muted-foreground/30" />
    );
  }
  // Use mono for numeric-looking values (e.g. "30", "5/mo", "500 posts")
  const hasNumber = /\d/.test(value);
  return (
    <span className={cn("text-sm text-foreground", hasNumber && "font-mono tabular-nums")}>
      {value}
    </span>
  );
}

function FAQItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-border/50">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between py-5 text-left"
      >
        <span className="text-[15px] font-medium text-foreground">{question}</span>
        <svg
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div
        className={cn(
          "grid transition-all duration-200 ease-in-out",
          isOpen ? "grid-rows-[1fr] pb-5 opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <p className="text-sm leading-relaxed text-muted-foreground">{answer}</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Main content ─── */

function PricingContent() {
  const searchParams = useSearchParams();
  const isBlocked = searchParams.get("blocked") === "true";
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const checkout = useCheckout();

  function handleSelectPlan(plan: PlanType) {
    checkout.mutate(
      { plan, billing_cycle: billingCycle },
      {
        onSuccess: (url) => {
          if (url) window.location.href = url;
        },
        onError: () => {
          toast.error("Failed to start checkout. Please try again.");
        },
      }
    );
  }

  return (
    <div className="flex flex-col items-center">
      {/* ─── Hero ─── */}
      <div className="mb-14 max-w-2xl text-center">
        <h1 className="mb-4 font-serif text-3xl font-normal tracking-tight text-foreground sm:text-4xl">
          {isBlocked
            ? "Your subscription has ended"
            : "Choose your plan to get started"}
        </h1>
        <p className="text-lg text-muted-foreground">
          {isBlocked
            ? "Resubscribe to regain access to your account and data."
            : "Start with a 14-day free trial. Cancel anytime."}
        </p>
      </div>

      {/* ─── Billing toggle ─── */}
      <div className="mb-12 flex items-center gap-3">
        <div className="flex items-center gap-1 rounded-full border border-border/60 bg-card/60 p-1 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setBillingCycle("monthly")}
            className={cn(
              "rounded-full px-5 py-1.5 text-sm font-medium transition-all",
              billingCycle === "monthly"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle("yearly")}
            className={cn(
              "rounded-full px-5 py-1.5 text-sm font-medium transition-all",
              billingCycle === "yearly"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Annual
          </button>
        </div>
        {billingCycle === "yearly" && (
          <span className="rounded-full bg-success-muted px-3 py-1 text-xs font-medium text-success">
            Save up to 17%
          </span>
        )}
      </div>

      {/* ─── Plan cards ─── */}
      <div className="grid w-full grid-cols-1 gap-5 md:grid-cols-3">
        {PLANS.map((plan) => {
          const pricing = PLAN_PRICING[plan];
          const features = PLAN_FEATURES[plan];
          const badge = PLAN_BADGES[plan];
          const isBusiness = plan === "business";

          const displayPrice =
            billingCycle === "monthly"
              ? pricing.monthly
              : pricing.monthly_equivalent_yearly;

          return (
            <div
              key={plan}
              className={cn(
                "relative flex flex-col rounded-2xl border p-7 transition-all",
                isBusiness
                  ? "border-primary/30 bg-card shadow-xl shadow-primary/[0.07] ring-1 ring-primary/15 md:-my-2 md:py-9"
                  : "border-border/50 bg-card/70"
              )}
            >
              {/* Badge */}
              {badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span
                    className={cn(
                      "rounded-full px-3.5 py-1 text-[11px] font-semibold tracking-wide uppercase",
                      isBusiness
                        ? "bg-primary text-primary-foreground"
                        : "bg-foreground/10 text-foreground/70"
                    )}
                  >
                    {badge}
                  </span>
                </div>
              )}

              {/* Plan name & description */}
              <div className="mb-5">
                <h3 className="text-lg font-semibold text-foreground">
                  {getPlanDisplayName(plan)}
                </h3>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {getPlanDescription(plan)}
                </p>
              </div>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-light tracking-tight font-mono tabular-nums text-foreground">
                    ${displayPrice}
                  </span>
                  <span className="text-sm text-muted-foreground">/mo</span>
                </div>
                {billingCycle === "yearly" && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Billed <span className="font-mono tabular-nums">${pricing.yearly}</span>/year
                    </span>
                    <span className="inline-flex rounded-full bg-success-muted px-2 py-0.5 text-[11px] font-medium text-success">
                      Save <span className="font-mono tabular-nums">${pricing.yearly_savings}</span>/yr
                    </span>
                  </div>
                )}
              </div>

              {/* CTA */}
              <Button
                variant={isBusiness ? "coral" : "outline"}
                size="lg"
                className={cn(
                  "mb-6 w-full",
                  !isBusiness && "hover:border-primary/40 hover:text-primary"
                )}
                loading={checkout.isPending}
                onClick={() => handleSelectPlan(plan)}
              >
                Start Free Trial
              </Button>

              {/* Trial note */}
              <p className="mb-5 text-center text-[11px] text-muted-foreground/70">
                14-day free trial &middot; No credit card required
              </p>

              {/* Divider */}
              <div className="mb-5 h-px bg-border/50" />

              {/* Features */}
              <div className="flex-1">
                <p className="mb-3 text-[11px] uppercase tracking-[0.15em] text-muted-foreground/60">
                  What&apos;s included
                </p>
                <ul className="space-y-2.5">
                  {features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-[13px] text-foreground/80"
                    >
                      <CheckIcon className="mt-0.5 text-primary/70" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Feature comparison table (Notion-style) ─── */}
      <div className="mt-24 w-full" data-testid="comparison-table">
        <div className="mb-10 text-center">
          <h2 className="font-serif text-2xl font-normal tracking-tight text-foreground sm:text-3xl">
            Plans and features
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Compare every feature across plans
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            {/* Table header */}
            <thead>
              <tr className="border-b border-border/60">
                <th className="w-[40%] pb-4 text-left text-sm font-normal text-muted-foreground" />
                {PLANS.map((plan) => (
                  <th key={plan} className="w-[20%] pb-4 text-center">
                    <span className="text-sm font-semibold text-foreground">
                      {getPlanDisplayName(plan)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {COMPARISON_DATA.map((section) => (
                <Fragment key={section.category}>
                  {/* Category header */}
                  <tr>
                    <td
                      colSpan={4}
                      className="pb-2 pt-8 text-[11px] uppercase tracking-[0.15em] text-primary font-medium"
                    >
                      {section.category}
                    </td>
                  </tr>

                  {/* Feature rows */}
                  {section.rows.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-border/30"
                    >
                      <td className="py-3.5 text-sm text-foreground/80">
                        {row.feature}
                      </td>
                      <td className="py-3.5 text-center">
                        <div className="flex items-center justify-center">
                          <ComparisonCell value={row.starter} />
                        </div>
                      </td>
                      <td className="py-3.5 text-center">
                        <div className="flex items-center justify-center">
                          <ComparisonCell value={row.business} />
                        </div>
                      </td>
                      <td className="py-3.5 text-center">
                        <div className="flex items-center justify-center">
                          <ComparisonCell value={row.agency} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>

            {/* Table footer CTAs */}
            <tfoot>
              <tr>
                <td className="pt-8" />
                {PLANS.map((plan) => {
                  const isBusiness = plan === "business";
                  return (
                    <td key={plan} className="pt-8 text-center">
                      <Button
                        variant={isBusiness ? "coral" : "outline"}
                        size="sm"
                        className={cn(
                          !isBusiness && "hover:border-primary/40 hover:text-primary"
                        )}
                        loading={checkout.isPending}
                        onClick={() => handleSelectPlan(plan)}
                      >
                        Start Free Trial
                      </Button>
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ─── FAQ Section ─── */}
      <div className="mt-24 w-full max-w-2xl" data-testid="faq-section">
        <div className="mb-8 text-center">
          <h2 className="font-serif text-2xl font-normal tracking-tight text-foreground sm:text-3xl">
            Questions & answers
          </h2>
        </div>
        <div className="divide-y-0">
          {FAQ_DATA.map((item, i) => (
            <FAQItem
              key={i}
              question={item.question}
              answer={item.answer}
              isOpen={openFaq === i}
              onToggle={() => setOpenFaq(openFaq === i ? null : i)}
            />
          ))}
        </div>
      </div>

      {/* ─── Footer guarantee ─── */}
      <div className="mt-20 mb-8 text-center">
        <div className="mx-auto mb-3 flex items-center justify-center gap-2 text-muted-foreground/50">
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2 3 7v5c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7l-9-5Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          <span className="text-xs font-medium uppercase tracking-[0.15em]">
            Secure checkout
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          No charge until your 14-day trial ends. Cancel anytime from your
          billing settings.
        </p>
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense>
      <PricingContent />
    </Suspense>
  );
}
