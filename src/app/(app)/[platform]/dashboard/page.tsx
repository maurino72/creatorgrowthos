"use client";

import { useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { usePlatform } from "@/lib/hooks/use-platform";
import { appUrl } from "@/lib/urls";
import { useDashboardMetrics, useTopPosts, useMetricsTimeSeries, metricKeys } from "@/lib/queries/metrics";
import { useQueryClient } from "@tanstack/react-query";
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
import {
  EyeIcon,
  HeartIcon,
  ArrowPathRoundedSquareIcon,
  ChartBarIcon,
  DocumentTextIcon,
  LightBulbIcon,
  SparklesIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
  ArrowPathIcon,
  TrophyIcon,
} from "@heroicons/react/24/outline";
import dynamic from "next/dynamic";

const DashboardCharts = dynamic(() => import("./charts"), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-10" data-testid="charts-skeleton">
      <div className="rounded-lg border border-border/40 bg-card/30 p-5">
        <Skeleton className="h-4 w-40 mb-4" />
        <Skeleton className="h-52 w-full" />
      </div>
      <div className="rounded-lg border border-border/40 bg-card/30 p-5">
        <Skeleton className="h-4 w-40 mb-4" />
        <Skeleton className="h-52 w-full" />
      </div>
    </div>
  ),
});

const PERIOD_OPTIONS = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
] as const;

const INSIGHT_TYPE_COLORS: Record<string, string> = {
  performance_pattern: "text-emerald-400",
  consistency_pattern: "text-blue-400",
  opportunity: "text-amber-400",
  anomaly: "text-rose-400",
};

const INSIGHT_TYPE_ICONS: Record<string, typeof ChartBarIcon> = {
  performance_pattern: ChartBarIcon,
  consistency_pattern: ArrowPathRoundedSquareIcon,
  opportunity: LightBulbIcon,
  anomaly: SparklesIcon,
};

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof EyeIcon;
  accent: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/50 p-5 transition-all hover:border-border hover:bg-card">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground/60">
          {label}
        </p>
        <div className={`rounded-md bg-card p-1.5 ${accent}`}>
          <Icon className="size-4" />
        </div>
      </div>
      <p className="text-3xl font-light tracking-tight font-mono tabular-nums">
        {value}
      </p>
      {sub && (
        <p className="mt-1.5 text-[11px] text-muted-foreground/40">{sub}</p>
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

function InsightCard({ insight }: { insight: InsightItem }) {
  const dismissInsight = useDismissInsight();
  const markActed = useMarkInsightActed();

  const typeLabel = insight.type.replace(/_/g, " ");
  const TypeIcon = INSIGHT_TYPE_ICONS[insight.type] ?? LightBulbIcon;
  const typeColor = INSIGHT_TYPE_COLORS[insight.type] ?? "text-muted-foreground";

  return (
    <div className="group rounded-lg border border-border/60 bg-card/50 p-4 transition-all hover:border-border hover:bg-card">
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 shrink-0 rounded-md bg-card p-1.5 ${typeColor}`}>
          <TypeIcon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/50">
              {typeLabel}
            </span>
            <span className="text-[10px] text-muted-foreground/30">
              {insight.confidence}
            </span>
          </div>
          <p className="text-sm font-medium leading-snug">{insight.headline}</p>
          <p className="text-xs text-muted-foreground/50 leading-relaxed mt-1">
            {insight.detail}
          </p>
          <p className="text-xs text-primary/70 mt-1.5">{insight.action}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border/40">
        <Button
          variant="ghost"
          size="xs"
          className="gap-1 text-success hover:bg-success-muted"
          onClick={() =>
            markActed.mutate(insight.id, {
              onSuccess: () => toast.success("Marked as acted on"),
              onError: () => toast.error("Failed to update"),
            })
          }
          loading={markActed.isPending}
        >
          <CheckCircleIcon className="size-3.5" />
          Acted on
        </Button>
        <Button
          variant="ghost"
          size="xs"
          className="gap-1 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10"
          onClick={() =>
            dismissInsight.mutate(insight.id, {
              onSuccess: () => toast.success("Insight dismissed"),
              onError: () => toast.error("Failed to dismiss"),
            })
          }
          loading={dismissInsight.isPending}
        >
          <XMarkIcon className="size-3.5" />
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
  const { platform, slug } = usePlatform();
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
    platform: platformFilter,
  });
  const generateInsights = useGenerateInsights();
  const { data: timeSeries } = useMetricsTimeSeries(days, platformFilter);
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: metricKeys.all });
    setRefreshing(false);
    toast.success("Metrics refreshed");
  };

  const hasData = metrics && metrics.postCount > 0;
  const hasPostsButNoMetrics = !hasData && posts && posts.length > 0;

  return (
    <div className="w-full">
      {/* ── Masthead ── */}
      <div className="flex items-end justify-between">
        <h1 className="text-3xl font-normal tracking-tight font-serif">
          Dashboard
        </h1>
        {/* ── Period Selector ── */}
        <div className="flex items-center gap-5">
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
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Refresh metrics"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <ArrowPathIcon className={`size-3.5 text-muted-foreground/60 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>
      <div className="h-px bg-editorial-rule mt-4 mb-8" />

      {/* ── Metrics Summary ── */}
      <div data-testid="tab-content" className={isPending ? "opacity-70 transition-opacity" : "transition-opacity"}>
      {metricsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border/40 bg-card/30 p-5">
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="size-7 rounded-md" />
              </div>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-28 mt-2" />
            </div>
          ))}
        </div>
      ) : hasData ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <MetricCard
            icon={EyeIcon}
            accent="text-blue-400"
            label="Impressions"
            value={formatNumber(metrics.totalImpressions)}
            sub={`Across ${metrics.postCount} posts`}
          />
          <MetricCard
            icon={HeartIcon}
            accent="text-rose-400"
            label="Engagement"
            value={String(metrics.totalEngagement)}
            sub={`${metrics.totalLikes} likes · ${metrics.totalReplies} replies · ${metrics.totalReposts} reposts`}
          />
          <MetricCard
            icon={ChartBarIcon}
            accent="text-emerald-400"
            label="Avg. Engagement Rate"
            value={formatEngagementRate(metrics.averageEngagementRate)}
          />
          <MetricCard
            icon={DocumentTextIcon}
            accent="text-primary"
            label="Posts"
            value={String(metrics.postCount)}
          />
        </div>
      ) : hasPostsButNoMetrics ? (
        <div className="rounded-lg border border-dashed border-border/60 p-8 mb-10 text-center">
          <ChartBarIcon className="size-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground/60">
            Metrics are being collected for your posts.
          </p>
          <p className="mt-1 text-xs text-muted-foreground/40">
            Check back soon — data usually appears within a few minutes.
          </p>
          <Button asChild className="mt-4" size="sm" variant="outline">
            <Link href={slug ? appUrl.content(slug) : "#"}>View Posts</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border/60 p-8 mb-10 text-center">
          <DocumentTextIcon className="size-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground/60">
            Publish your first post to see metrics here.
          </p>
          <Button asChild className="mt-4" size="sm" variant="coral">
            <Link href={slug ? appUrl.contentNew(slug) : "#"}>Create Post</Link>
          </Button>
        </div>
      )}

      {/* ── Charts ── */}
      {timeSeries && timeSeries.length > 1 && (
        <DashboardCharts data={timeSeries} />
      )}

      {/* ── Two-column: Top Posts + Insights ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Top Posts ── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrophyIcon className="size-4 text-amber-400" />
            <h2 className="text-lg font-normal tracking-tight font-serif">
              Top performing posts
            </h2>
          </div>

          {topLoading ? (
            <div className="rounded-lg border border-border/40 bg-card/30 p-4 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="size-5 rounded shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : topPosts && topPosts.length > 0 ? (
            <div className="rounded-lg border border-border/60 bg-card/50 divide-y divide-border/40">
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
                  <div key={event.id} className="flex items-start gap-3 p-4 transition-colors hover:bg-card">
                    <span className="flex items-center justify-center size-6 rounded-md bg-muted text-[11px] font-mono font-medium text-muted-foreground shrink-0 mt-0.5 tabular-nums">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug">{preview}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] font-mono tabular-nums text-muted-foreground/50">
                        <span className="inline-flex items-center gap-1">
                          <EyeIcon className="size-3" />
                          {formatNumber(event.impressions)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <HeartIcon className="size-3" />
                          {engagement}
                        </span>
                        <span>{formatEngagementRate(event.engagement_rate)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border/40 p-8 text-center">
              <p className="text-sm text-muted-foreground/40">No top posts yet for this period.</p>
            </div>
          )}
        </div>

        {/* ── Insights ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <SparklesIcon className="size-4 text-primary" />
              <h2 className="text-lg font-normal tracking-tight font-serif">
                Insights
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {insights && insights.length > 0 && (
                <Link
                  href={slug ? appUrl.insights(slug) : "#"}
                  className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.15em] text-muted-foreground/50 hover:text-foreground transition-colors"
                >
                  View all
                  <ArrowTopRightOnSquareIcon className="size-3" />
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

          {insightsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-border/40 bg-card/30 p-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="size-7 rounded-md shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : insights && insights.length > 0 ? (
            <div className="space-y-3">
              {(insights as InsightItem[]).slice(0, 3).map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border/40 p-8 text-center">
              <SparklesIcon className="size-8 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground/50">
                No insights yet. Generate insights from your posting history.
              </p>
            </div>
          )}
        </div>
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
