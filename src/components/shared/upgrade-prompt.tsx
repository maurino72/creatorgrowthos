"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCheckout, useUpgrade, useSubscription } from "@/lib/queries/billing";
import { getPlanDisplayName, type PlanType, type BillingCycle } from "@/lib/stripe/plans";

interface UpgradePromptProps {
  feature: string;
  upgradeTo: PlanType | string;
  variant?: "feature" | "limit";
  currentUsage?: string;
  onDismiss: () => void;
}

export function UpgradePrompt({
  feature,
  upgradeTo,
  variant = "feature",
  currentUsage,
  onDismiss,
}: UpgradePromptProps) {
  const { data: subscription } = useSubscription();
  const checkout = useCheckout();
  const upgrade = useUpgrade();
  const planName = getPlanDisplayName(upgradeTo as PlanType);

  const hasActiveSub =
    subscription?.status === "active" ||
    subscription?.status === "trialing" ||
    subscription?.status === "past_due";

  const isLoading = hasActiveSub ? upgrade.isPending : checkout.isPending;

  function handleUpgrade() {
    const plan = upgradeTo as PlanType;

    if (hasActiveSub) {
      const billingCycle = (subscription.billing_cycle as BillingCycle) ?? "monthly";
      upgrade.mutate(
        { plan, billing_cycle: billingCycle },
        {
          onSuccess: () => {
            toast.success(`Upgraded to ${planName}`);
            onDismiss();
          },
          onError: () => {
            toast.error("Failed to upgrade. Please try again.");
          },
        }
      );
    } else {
      checkout.mutate(
        { plan, billing_cycle: "monthly" },
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
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-card/80 p-5 backdrop-blur-sm">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">
          {variant === "limit"
            ? `You\u2019ve reached your ${feature} limit`
            : `Upgrade to ${planName} to unlock ${feature}`}
        </h3>
        {variant === "limit" && currentUsage && (
          <p className="mt-1 text-xs text-muted-foreground">
            Current usage: {currentUsage}
          </p>
        )}
        <p className="mt-1 text-sm text-muted-foreground">
          Upgrade to {planName} for more power and features.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="coral"
          size="sm"
          onClick={handleUpgrade}
          loading={isLoading}
        >
          Upgrade to {planName}
        </Button>
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          Maybe later
        </Button>
      </div>
    </div>
  );
}
