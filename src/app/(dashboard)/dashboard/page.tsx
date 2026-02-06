"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useDashboardMetrics, useTopPosts } from "@/lib/queries/metrics";
import { usePosts } from "@/lib/queries/posts";
import {
  useInsights,
  useGenerateInsights,
  useDismissInsight,
  useMarkInsightActed,
} from "@/lib/queries/insights";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber, formatEngagementRate } from "@/lib/utils/format";

const PERIOD_OPTIONS = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
] as const;

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
        {sub && (
          <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
        )}
      </CardContent>
    </Card>
  );
}

const INSIGHT_TYPE_STYLES: Record<string, string> = {
  performance_pattern:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
  consistency_pattern:
    "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20",
  opportunity:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
  anomaly:
    "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20",
};

const INSIGHT_TYPE_LABELS: Record<string, string> = {
  performance_pattern: "Performance",
  consistency_pattern: "Consistency",
  opportunity: "Opportunity",
  anomaly: "Anomaly",
};

const CONFIDENCE_STYLES: Record<string, string> = {
  high: "text-emerald-600 dark:text-emerald-400",
  medium: "text-amber-600 dark:text-amber-400",
  low: "text-zinc-500 dark:text-zinc-400",
};

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

function InsightCard({ insight }: { insight: InsightItem }) {
  const dismissInsight = useDismissInsight();
  const markActed = useMarkInsightActed();

  return (
    <Card className="transition-colors hover:border-foreground/20">
      <CardContent className="pt-5 space-y-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${INSIGHT_TYPE_STYLES[insight.type] ?? ""}`}
          >
            {INSIGHT_TYPE_LABELS[insight.type] ?? insight.type}
          </span>
          <span className={`text-[11px] font-medium ${CONFIDENCE_STYLES[insight.confidence] ?? ""}`}>
            {insight.confidence} confidence
          </span>
        </div>
        <p className="text-sm font-medium leading-snug">{insight.headline}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {insight.detail}
        </p>
        <p className="text-xs font-medium text-foreground/80">
          {insight.action}
        </p>
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
      </CardContent>
    </Card>
  );
}

interface TopPostEvent {
  id: string;
  impressions?: number;
  likes?: number;
  replies?: number;
  reposts?: number;
  engagement_rate?: number | null;
  post_publications?: {
    post_id?: string;
    platform?: string;
    posts?: { body?: string; status?: string };
  };
}

export default function DashboardPage() {
  const [days, setDays] = useState(7);
  const { data: metrics, isLoading: metricsLoading } =
    useDashboardMetrics(days);
  const { data: topPosts, isLoading: topLoading } = useTopPosts(days, 5);
  const { data: posts } = usePosts();
  const { data: insights, isLoading: insightsLoading } = useInsights({ limit: 3 });
  const generateInsights = useGenerateInsights();

  const hasData = metrics && metrics.postCount > 0;
  const hasPostsButNoMetrics = !hasData && posts && posts.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Your content performance at a glance.
          </p>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex items-center gap-1">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setDays(opt.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              days === opt.value
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Metrics Summary */}
      {metricsLoading ? (
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-5 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : hasData ? (
        <div className="grid grid-cols-4 gap-4">
          <MetricCard
            label="Total Impressions"
            value={formatNumber(metrics.totalImpressions)}
            sub={`Across ${metrics.postCount} posts`}
          />
          <MetricCard
            label="Total Engagement"
            value={String(metrics.totalEngagement)}
            sub={`${metrics.totalLikes} likes · ${metrics.totalReplies} replies · ${metrics.totalReposts} reposts`}
          />
          <MetricCard
            label="Avg. Engagement Rate"
            value={formatEngagementRate(metrics.averageEngagementRate)}
          />
          <MetricCard label="Posts" value={String(metrics.postCount)} />
        </div>
      ) : hasPostsButNoMetrics ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
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
                <path d="M3 3v18h18" />
                <path d="M7 16l4-4 4 4 5-6" />
              </svg>
            </div>
            <p className="text-sm font-medium">
              Metrics are being collected for your posts.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Check back soon — data usually appears within a few minutes.
            </p>
            <Button asChild className="mt-4" size="sm" variant="outline">
              <Link href="/dashboard/content">View Posts</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
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
                <path d="M3 3v18h18" />
                <path d="M7 16l4-4 4 4 5-6" />
              </svg>
            </div>
            <p className="text-sm font-medium">
              Publish your first post to see metrics here.
            </p>
            <Button asChild className="mt-4" size="sm">
              <Link href="/dashboard/content/new">Create Post</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Top Posts */}
      {!topLoading && topPosts && topPosts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">
            Top performing posts
          </h2>
          <div className="space-y-2">
            {(topPosts as TopPostEvent[]).map((event, idx) => {
              const body =
                event.post_publications?.posts?.body ?? "Untitled post";
              const preview =
                body.length > 80 ? body.slice(0, 80) + "..." : body;
              const engagement =
                (event.likes ?? 0) +
                (event.replies ?? 0) +
                (event.reposts ?? 0);

              return (
                <Card key={event.id}>
                  <CardContent className="flex items-center gap-4 py-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{preview}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatNumber(event.impressions)} views ·{" "}
                        {engagement} engagements ·{" "}
                        {formatEngagementRate(event.engagement_rate)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Insights */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Insights</h2>
          <div className="flex items-center gap-2">
            {insights && insights.length > 0 && (
              <Button asChild variant="ghost" size="xs">
                <Link href="/dashboard/insights">View all</Link>
              </Button>
            )}
            <Button
              variant="outline"
              size="xs"
              onClick={() =>
                generateInsights.mutate(undefined, {
                  onSuccess: () => toast.success("Insights generated!"),
                  onError: (err: Error) => toast.error(err.message),
                })
              }
              disabled={generateInsights.isPending}
            >
              {generateInsights.isPending ? "Generating..." : "Generate Insights"}
            </Button>
          </div>
        </div>

        {insightsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-5 space-y-2">
                  <Skeleton className="h-4 w-20 rounded-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : insights && insights.length > 0 ? (
          <div className="space-y-2">
            {(insights as InsightItem[]).slice(0, 3).map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No insights yet. Generate insights from your posting history.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
