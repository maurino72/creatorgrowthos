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

function InsightEntry({
  insight,
  showActions,
}: {
  insight: InsightItem;
  showActions: boolean;
}) {
  const dismissInsight = useDismissInsight();
  const markActed = useMarkInsightActed();

  const typeLabel = INSIGHT_TYPE_BADGE_STYLES[insight.type]?.label ?? insight.type.replace(/_/g, " ");

  return (
    <div className="group py-4">
      <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/40">
        {typeLabel} &middot; {insight.confidence} confidence
      </p>
      <p className="text-[15px] font-serif leading-snug mt-1.5">
        {insight.headline}
      </p>
      <p className="text-xs text-muted-foreground/50 leading-relaxed mt-1.5">
        {insight.detail}
      </p>

      {insight.data_points.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
          {insight.data_points.map((dp, idx) => (
            <span
              key={idx}
              className="text-[11px] font-mono tabular-nums text-muted-foreground/50"
            >
              <span className="text-foreground/60">{dp.metric}:</span>{" "}
              {dp.value}
              {dp.comparison && (
                <span className="text-muted-foreground/30">
                  {" "}({dp.comparison})
                </span>
              )}
            </span>
          ))}
        </div>
      )}

      <p className="text-xs text-foreground/60 mt-1.5">
        {insight.action}
      </p>

      {showActions && (
        <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
    </div>
  );
}

function InsightSkeleton() {
  return (
    <div data-testid="insight-skeleton" className="py-4 space-y-2">
      <Skeleton className="h-2.5 w-32" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
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
    <div className="mx-auto max-w-3xl">
      {/* ── Masthead ── */}
      <div className="flex items-end justify-between">
        <h1 className="text-3xl font-normal tracking-tight font-serif">
          Insights
        </h1>
        <Button
          variant="outline"
          size="xs"
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
      <div className="h-px bg-editorial-rule mt-4 mb-8" />

      {/* ── Status Tabs ── */}
      <div className="flex items-center gap-6 mb-6">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveStatus(tab.value)}
            className={`text-[11px] uppercase tracking-[0.15em] pb-1 transition-colors border-b ${
              activeStatus === tab.value
                ? "text-foreground border-foreground/60"
                : "text-muted-foreground/40 border-transparent hover:text-foreground/70"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Type Tabs ── */}
      <div className="flex items-center gap-6 mb-8">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setActiveType(tab.value)}
            className={`text-[11px] uppercase tracking-[0.15em] pb-1 transition-colors ${
              activeType === tab.value
                ? "text-foreground"
                : "text-muted-foreground/30 hover:text-foreground/60"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <InsightSkeleton />
              {i < 2 && <div className="h-px bg-editorial-rule-subtle" />}
            </div>
          ))}
        </div>
      ) : insights && insights.length > 0 ? (
        <div>
          {(insights as InsightItem[]).map((insight, idx) => (
            <div key={insight.id}>
              <InsightEntry insight={insight} showActions={showActions} />
              {idx < insights.length - 1 && (
                <div className="h-px bg-editorial-rule-subtle" />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground/60">No insights yet</p>
          <p className="mt-1 text-xs text-muted-foreground/40">
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
