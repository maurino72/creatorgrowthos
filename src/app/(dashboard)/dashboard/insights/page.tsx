"use client";

import { useState, Suspense } from "react";
import { toast } from "sonner";
import { usePlatform } from "@/lib/hooks/use-platform";
import {
  useInsights,
  useGenerateInsights,
  useDismissInsight,
  useMarkInsightActed,
} from "@/lib/queries/insights";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  INSIGHT_TYPE_BADGE_STYLES,
  CONFIDENCE_STYLES,
} from "@/lib/ui/badge-styles";

const STATUS_TABS = [
  { label: "Active", value: "active" },
  { label: "Dismissed", value: "dismissed" },
  { label: "Acted On", value: "acted_on" },
] as const;

const TYPE_TABS = [
  { label: "All", value: undefined },
  { label: "Performance", value: "performance_pattern" },
  { label: "Consistency", value: "consistency_pattern" },
  { label: "Opportunity", value: "opportunity" },
  { label: "Anomaly", value: "anomaly" },
] as const;


interface InsightItem {
  id: string;
  type: string;
  headline: string;
  detail: string;
  action: string;
  confidence: string;
  data_points: { metric: string; value: string; comparison?: string }[];
  status: string;
}

function InsightCard({
  insight,
  showActions,
}: {
  insight: InsightItem;
  showActions: boolean;
}) {
  const dismissInsight = useDismissInsight();
  const markActed = useMarkInsightActed();

  return (
    <Card className="transition-colors hover:border-foreground/20">
      <CardContent className="pt-5 space-y-3">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${INSIGHT_TYPE_BADGE_STYLES[insight.type]?.className ?? ""}`}
          >
            {INSIGHT_TYPE_BADGE_STYLES[insight.type]?.label ?? insight.type}
          </span>
          <span
            className={`text-[11px] font-medium ${CONFIDENCE_STYLES[insight.confidence]?.className ?? ""}`}
          >
            {insight.confidence} confidence
          </span>
        </div>

        <div className="space-y-1.5">
          <p className="text-sm font-medium leading-snug">{insight.headline}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {insight.detail}
          </p>
        </div>

        {insight.data_points.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {insight.data_points.map((dp, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-1 text-[11px]"
              >
                <span className="font-medium">{dp.metric}:</span>
                <span>{dp.value}</span>
                {dp.comparison && (
                  <span className="text-muted-foreground">
                    ({dp.comparison})
                  </span>
                )}
              </span>
            ))}
          </div>
        )}

        <p className="text-xs font-medium text-foreground/80">
          {insight.action}
        </p>

        {showActions && (
          <div className="flex items-center gap-1 pt-1">
            <Button
              variant="ghost"
              size="xs"
              onClick={() =>
                markActed.mutate(insight.id, {
                  onSuccess: () => toast.success("Marked as acted on"),
                  onError: () => toast.error("Failed to update"),
                })
              }
              disabled={markActed.isPending}
            >
              Acted on
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onClick={() =>
                dismissInsight.mutate(insight.id, {
                  onSuccess: () => toast.success("Insight dismissed"),
                  onError: () => toast.error("Failed to dismiss"),
                })
              }
              disabled={dismissInsight.isPending}
            >
              Dismiss
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InsightSkeleton() {
  return (
    <Card data-testid="insight-skeleton">
      <CardContent className="pt-5 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </CardContent>
    </Card>
  );
}

function InsightsPageInner() {
  const [activeStatus, setActiveStatus] = useState("active");
  const [activeType, setActiveType] = useState<string | undefined>(undefined);
  const { platform } = usePlatform();
  const platformFilter = platform ?? undefined;

  const { data: insights, isLoading } = useInsights({
    status: activeStatus,
    type: activeType,
  });
  const generateInsights = useGenerateInsights();

  const showActions = activeStatus === "active";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Insights</h1>
          <p className="text-sm text-muted-foreground">
            AI-powered analysis of your content performance.
          </p>
        </div>
        <Button
          onClick={() =>
            generateInsights.mutate(platformFilter, {
              onSuccess: () => toast.success("Insights generated!"),
              onError: (err: Error) => toast.error(err.message),
            })
          }
          disabled={generateInsights.isPending}
        >
          {generateInsights.isPending ? "Generating..." : "Generate Insights"}
        </Button>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-1 border-b border-border pb-px">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveStatus(tab.value)}
            className={`rounded-t-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeStatus === tab.value
                ? "border-b-2 border-foreground text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Type Tabs */}
      <div className="flex items-center gap-1">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setActiveType(tab.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeType === tab.value
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <InsightSkeleton key={i} />
          ))}
        </div>
      ) : insights && insights.length > 0 ? (
        <div className="space-y-3">
          {(insights as InsightItem[]).map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              showActions={showActions}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted-foreground"
            >
              <path d="M9 2v4M9 12v4M2 9h4M12 9h4" />
              <circle cx="9" cy="9" r="2" />
            </svg>
          </div>
          <p className="mt-4 text-sm font-medium">No insights yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Generate insights from your posting history to get started.
          </p>
        </div>
      )}
    </div>
  );
}

export default function InsightsPage() {
  return (
    <Suspense>
      <InsightsPageInner />
    </Suspense>
  );
}
