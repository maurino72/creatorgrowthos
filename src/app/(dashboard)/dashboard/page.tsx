"use client";

import { useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { usePlatform } from "@/lib/hooks/use-platform";
import { useDashboardMetrics, useTopPosts } from "@/lib/queries/metrics";
import { usePosts } from "@/lib/queries/posts";
import {
  useInsights,
  useGenerateInsights,
  useDismissInsight,
  useMarkInsightActed,
} from "@/lib/queries/insights";
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
    <div>
      <p className="text-[10px] uppercase tracking-[0.2em] text-editorial-label">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-light tracking-tight font-mono tabular-nums">
        {value}
      </p>
      {sub && (
        <p className="mt-1 text-[11px] text-muted-foreground/40">{sub}</p>
      )}
    </div>
  );
}

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

function InsightEntry({ insight }: { insight: InsightItem }) {
  const dismissInsight = useDismissInsight();
  const markActed = useMarkInsightActed();

  const typeLabel = insight.type.replace(/_/g, " ");

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
      <p className="text-xs text-foreground/60 mt-1">
        {insight.action}
      </p>
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
          loading={markActed.isPending}
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
          loading={dismissInsight.isPending}
        >
          Dismiss
        </Button>
      </div>
    </div>
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

function DashboardContent() {
  const [days, setDays] = useState(7);
  const [isPending, startTransition] = useTransition();
  const { platform } = usePlatform();
  const platformFilter = platform ?? undefined;
  const { data: metrics, isLoading: metricsLoading } =
    useDashboardMetrics(days, platformFilter);
  const { data: topPosts, isLoading: topLoading } =
    useTopPosts(days, 5, platformFilter);
  const { data: posts } = usePosts(
    platformFilter ? { platform: platformFilter } : undefined,
  );
  const { data: insights, isLoading: insightsLoading } = useInsights({
    limit: 3,
  });
  const generateInsights = useGenerateInsights();

  const hasData = metrics && metrics.postCount > 0;
  const hasPostsButNoMetrics = !hasData && posts && posts.length > 0;

  return (
    <div className="mx-auto max-w-3xl">
      {/* ── Masthead ── */}
      <h1 className="text-3xl font-normal tracking-tight font-serif">
        Dashboard
      </h1>
      <div className="h-px bg-editorial-rule mt-4 mb-8" />

      {/* ── Period Selector ── */}
      <div className="flex items-center gap-6 mb-8">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => startTransition(() => setDays(opt.value))}
            className={`text-[11px] uppercase tracking-[0.15em] pb-1 transition-colors border-b ${
              days === opt.value
                ? "text-foreground border-foreground/60"
                : "text-muted-foreground/40 border-transparent hover:text-foreground/70"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* ── Metrics Summary ── */}
      <div data-testid="tab-content" className={isPending ? "opacity-70 transition-opacity" : "transition-opacity"}>
      {metricsLoading ? (
        <div className="grid grid-cols-4 gap-8 mb-10">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="h-7 w-14" />
            </div>
          ))}
        </div>
      ) : hasData ? (
        <>
          <div className="grid grid-cols-4 gap-8 mb-10">
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
          <div className="h-px bg-editorial-rule-subtle mb-10" />
        </>
      ) : hasPostsButNoMetrics ? (
        <div className="mb-10">
          <p className="text-sm text-muted-foreground/60">
            Metrics are being collected for your posts.
          </p>
          <p className="mt-1 text-xs text-muted-foreground/40">
            Check back soon — data usually appears within a few minutes.
          </p>
          <Button asChild className="mt-4" size="sm" variant="outline">
            <Link href="/dashboard/content">View Posts</Link>
          </Button>
          <div className="h-px bg-editorial-rule-subtle mt-8" />
        </div>
      ) : (
        <div className="mb-10">
          <p className="text-sm text-muted-foreground/60">
            Publish your first post to see metrics here.
          </p>
          <Button asChild className="mt-4" size="sm">
            <Link href="/dashboard/content/new">Create Post</Link>
          </Button>
          <div className="h-px bg-editorial-rule-subtle mt-8" />
        </div>
      )}

      {/* ── Top Posts ── */}
      {!topLoading && topPosts && topPosts.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xl font-normal tracking-tight font-serif mb-4">
            Top performing posts
          </h2>
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
              <div key={event.id}>
                <div className="flex items-start gap-4 py-3">
                  <span className="text-[11px] font-mono text-muted-foreground/30 pt-0.5 tabular-nums">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-serif">{preview}</p>
                    <p className="text-[11px] text-muted-foreground/40 font-mono tabular-nums mt-1">
                      {formatNumber(event.impressions)} views &middot;{" "}
                      {engagement} engagements &middot;{" "}
                      {formatEngagementRate(event.engagement_rate)}
                    </p>
                  </div>
                </div>
                <div className="h-px bg-editorial-rule-subtle" />
              </div>
            );
          })}
        </div>
      )}

      {/* ── Insights ── */}
      <div>
        <div className="flex items-end justify-between mb-1">
          <h2 className="text-xl font-normal tracking-tight font-serif">
            Insights
          </h2>
          <div className="flex items-center gap-3">
            {insights && insights.length > 0 && (
              <Link
                href="/dashboard/insights"
                className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 hover:text-foreground transition-colors"
              >
                View all
              </Link>
            )}
            <Button
              variant="outline"
              size="xs"
              onClick={() =>
                generateInsights.mutate(platformFilter, {
                  onSuccess: () => toast.success("Insights generated!"),
                  onError: (err: Error) => toast.error(err.message),
                })
              }
              loading={generateInsights.isPending}
            >
              Generate Insights
            </Button>
          </div>
        </div>
        <div className="h-px bg-editorial-rule mb-1" />

        {insightsLoading ? (
          <div className="space-y-4 py-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-2.5 w-32" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        ) : insights && insights.length > 0 ? (
          <div>
            {(insights as InsightItem[]).slice(0, 3).map((insight, idx) => (
              <div key={insight.id}>
                <InsightEntry insight={insight} />
                {idx < Math.min(insights.length, 3) - 1 && (
                  <div className="h-px bg-editorial-rule-subtle" />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8">
            <p className="text-sm text-muted-foreground/50">
              No insights yet. Generate insights from your posting history.
            </p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}
