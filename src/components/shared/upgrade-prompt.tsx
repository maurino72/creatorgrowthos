"use client";

import { Button } from "@/components/ui/button";
import { useCheckout } from "@/lib/queries/billing";
import { getPlanDisplayName, type PlanType } from "@/lib/stripe/plans";

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
  const checkout = useCheckout();
  const planName = getPlanDisplayName(upgradeTo as PlanType);

  function handleUpgrade() {
    checkout.mutate(
      { plan: upgradeTo as PlanType, billing_cycle: "monthly" },
      {
        onSuccess: (url) => {
          if (url) window.location.href = url;
        },
      }
    );
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
          loading={checkout.isPending}
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
