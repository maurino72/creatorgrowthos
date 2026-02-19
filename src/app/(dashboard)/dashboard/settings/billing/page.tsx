"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useSubscription,
  useUsage,
  useInvoices,
  usePortal,
} from "@/lib/queries/billing";
import { getPlanDisplayName, type PlanType } from "@/lib/stripe/plans";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "bg-success-muted text-success" },
  trialing: { label: "Trial", color: "bg-info-muted text-info" },
  past_due: { label: "Past Due", color: "bg-warning-muted text-warning" },
  canceled: { label: "Canceled", color: "bg-destructive-muted text-destructive" },
  unpaid: { label: "Unpaid", color: "bg-destructive-muted text-destructive" },
};

function UsageMeter({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
  const isNearLimit = !isUnlimited && percentage >= 80;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="text-foreground">{label}</span>
        <span className="text-muted-foreground">
          {isUnlimited ? `${used} (Unlimited)` : `${used} / ${limit}`}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isUnlimited
              ? "bg-primary/30"
              : isNearLimit
                ? "bg-warning"
                : "bg-primary"
          )}
          style={{ width: isUnlimited ? "10%" : `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function formatCurrency(amountCents: number): string {
  return `$${(amountCents / 100).toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getDaysRemaining(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

export default function BillingSettingsPage() {
  const { data: subscription, isLoading: subLoading } = useSubscription();
  const { data: usage, isLoading: usageLoading } = useUsage();
  const { data: invoices, isLoading: invoicesLoading } = useInvoices();
  const portal = usePortal();

  function handleManage() {
    portal.mutate(undefined, {
      onSuccess: (url) => {
        if (url) window.location.href = url;
      },
    });
  }

  const isLoading = subLoading || usageLoading || invoicesLoading;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Billing & Subscription
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your plan, usage, and billing details.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      ) : (
        <>
          {/* Current Plan */}
          {subscription && (
            <div className="rounded-xl border border-border/50 bg-card/50 p-6">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-foreground">
                      {getPlanDisplayName(subscription.plan as PlanType)}
                    </h2>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        STATUS_LABELS[subscription.status]?.color ??
                          "bg-secondary text-muted-foreground"
                      )}
                    >
                      {STATUS_LABELS[subscription.status]?.label ??
                        subscription.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {subscription.billing_cycle === "yearly"
                      ? "Annual billing"
                      : "Monthly billing"}
                    {subscription.current_period_end &&
                      ` \u00b7 Renews ${formatDate(subscription.current_period_end)}`}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManage}
                  loading={portal.isPending}
                >
                  Manage Subscription
                </Button>
              </div>

              {/* Trial info */}
              {subscription.status === "trialing" && subscription.trial_end && (
                <div className="rounded-lg border border-info/20 bg-info-muted p-3">
                  <p className="text-sm text-info">
                    <strong>{getDaysRemaining(subscription.trial_end)} days remaining</strong>{" "}
                    in your free trial. Your card will be charged on{" "}
                    {formatDate(subscription.trial_end)}.
                  </p>
                </div>
              )}

              {/* Cancel notice */}
              {subscription.cancel_at_period_end && (
                <div className="rounded-lg border border-warning/20 bg-warning-muted p-3">
                  <p className="text-sm text-warning">
                    Your subscription will end on{" "}
                    {subscription.current_period_end
                      ? formatDate(subscription.current_period_end)
                      : "the end of your billing period"}
                    .
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Usage */}
          {usage && (
            <div className="rounded-xl border border-border/50 bg-card/50 p-6">
              <h2 className="mb-4 text-lg font-semibold text-foreground">
                Usage This Period
              </h2>
              <div className="space-y-4">
                <UsageMeter
                  label="Posts"
                  used={usage.posts_used}
                  limit={usage.posts_limit}
                />
                <UsageMeter
                  label="AI Improvements"
                  used={usage.ai_improvements_used}
                  limit={usage.ai_improvements_limit}
                />
                <UsageMeter
                  label="Insights"
                  used={usage.insights_used}
                  limit={usage.insights_limit}
                />
              </div>
            </div>
          )}

          {/* Invoices */}
          {invoices && invoices.length > 0 && (
            <div className="rounded-xl border border-border/50 bg-card/50 p-6">
              <h2 className="mb-4 text-lg font-semibold text-foreground">
                Billing History
              </h2>
              <div className="space-y-3">
                {invoices.map(
                  (invoice: {
                    id: string;
                    amount: number;
                    status: string;
                    invoice_url?: string;
                    created_at?: string;
                  }) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between rounded-lg border border-border/30 px-4 py-3"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-foreground">
                          {formatCurrency(invoice.amount)}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            invoice.status === "paid"
                              ? "bg-success-muted text-success"
                              : "bg-secondary text-muted-foreground"
                          )}
                        >
                          {invoice.status === "paid" ? "Paid" : invoice.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {invoice.created_at && (
                          <span className="text-xs text-muted-foreground">
                            {formatDate(invoice.created_at)}
                          </span>
                        )}
                        {invoice.invoice_url && (
                          <a
                            href={invoice.invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
                          >
                            View
                          </a>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
