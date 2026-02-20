"use client";

import { useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { usePlatform } from "@/lib/hooks/use-platform";
import { appUrl } from "@/lib/urls";
import type { PlatformSlug } from "@/lib/platform-slug";
import {
  useAnalyticsOverview,
  useAnalyticsPosts,
  useFollowerGrowth,
  useRefreshAnalytics,
} from "@/lib/queries/analytics";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber, formatEngagementRate } from "@/lib/utils/format";
import {
  EyeIcon,
  HeartIcon,
  ChartBarIcon,
  UsersIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  ChatBubbleLeftEllipsisIcon,
  ArrowUpRightIcon,
  BookmarkIcon,
} from "@heroicons/react/24/outline";

const ContentBreakdown = dynamic(() => import("./content-breakdown"), {
  ssr: false,
  loading: () => (
    <div className="rounded-lg border border-border/40 bg-card/30 p-5">
      <Skeleton className="h-4 w-48 mb-4" />
      <Skeleton className="h-48 w-full" />
    </div>
  ),
});

const BestTimeHeatmap = dynamic(() => import("./best-time-heatmap"), {
  ssr: false,
  loading: () => (
    <div className="rounded-lg border border-border/40 bg-card/30 p-5">
      <Skeleton className="h-4 w-36 mb-4" />
      <Skeleton className="h-48 w-full" />
    </div>
  ),
});

const AnalyticsCharts = dynamic(() => import("./charts"), {
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
  { label: "7 days", value: "7d" },
  { label: "30 days", value: "30d" },
  { label: "90 days", value: "90d" },
] as const;

const PLATFORM_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  twitter: "X (Twitter)",
};

const PLATFORM_COLORS: Record<string, string> = {
  linkedin: "text-blue-600 dark:text-blue-400",
  twitter: "text-foreground",
};

// ─── MetricCard ─────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  trend,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof EyeIcon;
  accent: string;
  trend?: { value: number; label: string } | null;
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
      {trend ? (
        <div className="mt-1.5 flex items-center gap-1">
          {trend.value >= 0 ? (
            <ArrowTrendingUpIcon className="size-3 text-emerald-500" />
          ) : (
            <ArrowTrendingDownIcon className="size-3 text-rose-500" />
          )}
          <span
            className={`text-[11px] font-mono tabular-nums ${
              trend.value >= 0 ? "text-emerald-500" : "text-rose-500"
            }`}
          >
            {trend.value >= 0 ? "+" : ""}
            {trend.value}%
          </span>
          <span className="text-[11px] text-muted-foreground/40">
            {trend.label}
          </span>
        </div>
      ) : sub ? (
        <p className="mt-1.5 text-[11px] text-muted-foreground/40">{sub}</p>
      ) : null}
    </div>
  );
}

// ─── PlatformBreakdown ──────────────────────────────────────────────────

interface PlatformStats {
  posts_count: number;
  total_impressions: number;
  total_reach: number;
  total_reactions: number;
  total_comments: number;
  total_shares: number;
  total_quotes: number;
  total_bookmarks: number;
  avg_engagement_rate: number;
  follower_count: number;
  follower_growth: number;
  follower_growth_rate: number;
}

function PlatformBreakdown({
  platform,
  stats,
}: {
  platform: string;
  stats: PlatformStats;
}) {
  const color = PLATFORM_COLORS[platform] ?? "text-foreground";
  const label = PLATFORM_LABELS[platform] ?? platform;

  return (
    <div className="rounded-lg border border-border/60 bg-card/50 p-5 transition-all hover:border-border hover:bg-card">
      <div className="flex items-center gap-2 mb-4">
        <span className={`text-sm font-medium ${color}`}>{label}</span>
        <span className="text-[10px] text-muted-foreground/40 font-mono">
          {stats.posts_count} posts
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/50 mb-0.5">
            Impressions
          </p>
          <p className="text-lg font-light font-mono tabular-nums">
            {formatNumber(stats.total_impressions)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/50 mb-0.5">
            Engagement
          </p>
          <p className="text-lg font-light font-mono tabular-nums">
            {formatEngagementRate(stats.avg_engagement_rate)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/50 mb-0.5">
            Followers
          </p>
          <p className="text-lg font-light font-mono tabular-nums">
            {formatNumber(stats.follower_count)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/50 mb-0.5">
            Growth
          </p>
          <div className="flex items-center gap-1">
            {stats.follower_growth >= 0 ? (
              <ArrowTrendingUpIcon className="size-3.5 text-emerald-500" />
            ) : (
              <ArrowTrendingDownIcon className="size-3.5 text-rose-500" />
            )}
            <span
              className={`text-lg font-light font-mono tabular-nums ${
                stats.follower_growth >= 0
                  ? "text-emerald-500"
                  : "text-rose-500"
              }`}
            >
              {stats.follower_growth >= 0 ? "+" : ""}
              {formatNumber(stats.follower_growth)}
            </span>
          </div>
        </div>
      </div>

      {/* Engagement breakdown */}
      <div className="mt-4 pt-3 border-t border-border/40">
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground/50">
          <span className="inline-flex items-center gap-1">
            <HeartIcon className="size-3" />
            {formatNumber(stats.total_reactions)}
          </span>
          <span className="inline-flex items-center gap-1">
            <ChatBubbleLeftEllipsisIcon className="size-3" />
            {formatNumber(stats.total_comments)}
          </span>
          <span className="inline-flex items-center gap-1">
            <ArrowUpRightIcon className="size-3" />
            {formatNumber(stats.total_shares)}
          </span>
          {stats.total_bookmarks > 0 && (
            <span className="inline-flex items-center gap-1">
              <BookmarkIcon className="size-3" />
              {formatNumber(stats.total_bookmarks)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── TopPostRow ─────────────────────────────────────────────────────────

interface AnalyticsPost {
  id: string;
  publication_id: string;
  platform: string;
  platform_post_id: string;
  content_type: string | null;
  commentary: string;
  published_at: string;
  metrics: {
    impressions: number | null;
    reactions: number | null;
    comments: number | null;
    shares: number | null;
    engagement_rate: number;
  } | null;
  metrics_updated_at: string | null;
}

function TopPostRow({
  post,
  rank,
  slug,
}: {
  post: AnalyticsPost;
  rank: number;
  slug: PlatformSlug | null;
}) {
  const preview =
    post.commentary.length > 80
      ? post.commentary.slice(0, 80) + "..."
      : post.commentary;
  const platformLabel = PLATFORM_LABELS[post.platform] ?? post.platform;
  const href = slug
    ? `${appUrl.analytics(slug)}/${post.publication_id}`
    : "#";

  return (
    <Link
      href={href}
      className="flex items-start gap-3 p-4 transition-colors hover:bg-card"
    >
      <span className="flex items-center justify-center size-6 rounded-md bg-muted text-[11px] font-mono font-medium text-muted-foreground shrink-0 mt-0.5 tabular-nums">
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug">{preview}</p>
        <div className="flex items-center gap-3 mt-1.5 text-[11px] font-mono tabular-nums text-muted-foreground/50">
          <span className={PLATFORM_COLORS[post.platform] ?? ""}>
            {platformLabel}
          </span>
          <span className="inline-flex items-center gap-1">
            <EyeIcon className="size-3" />
            {formatNumber(post.metrics?.impressions ?? 0)}
          </span>
          <span className="inline-flex items-center gap-1">
            <HeartIcon className="size-3" />
            {(post.metrics?.reactions ?? 0) +
              (post.metrics?.comments ?? 0) +
              (post.metrics?.shares ?? 0)}
          </span>
          <span>
            {formatEngagementRate(post.metrics?.engagement_rate ?? 0)}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── AnalyticsContent ───────────────────────────────────────────────────

function AnalyticsContent() {
  const [period, setPeriod] = useState<string>("30d");
  const [isPending, startTransition] = useTransition();
  const { slug } = usePlatform();

  const { data: overview, isLoading: overviewLoading } =
    useAnalyticsOverview(period);
  const { data: postsData, isLoading: postsLoading } = useAnalyticsPosts({
    period,
    sort: "impressions",
    per_page: 5,
  });
  const { data: followerData } = useFollowerGrowth(period);
  const refreshAnalytics = useRefreshAnalytics();

  const platforms = overview?.platforms ?? {};
  const combined = overview?.combined ?? {
    total_posts: 0,
    total_impressions: 0,
    total_engagements: 0,
    avg_engagement_rate: 0,
    total_follower_growth: 0,
  };
  const topPosts = (postsData?.posts ?? []) as AnalyticsPost[];
  const hasPlatforms = Object.keys(platforms).length > 0;

  return (
    <div className="w-full">
      {/* ── Masthead ── */}
      <div className="flex items-end justify-between">
        <h1 className="text-3xl font-normal tracking-tight font-serif">
          Analytics
        </h1>
        <div className="flex items-center gap-5">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() =>
                startTransition(() => setPeriod(opt.value))
              }
              className={`text-[11px] uppercase tracking-[0.15em] pb-1 transition-colors border-b ${
                period === opt.value
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
            aria-label="Refresh analytics"
            onClick={() => {
              const platformToRefresh = Object.keys(platforms)[0];
              if (platformToRefresh) {
                refreshAnalytics.mutate(platformToRefresh, {
                  onSuccess: () => toast.success("Analytics refresh triggered"),
                  onError: (err: Error) => toast.error(err.message),
                });
              }
            }}
            disabled={refreshAnalytics.isPending}
          >
            <ArrowPathIcon
              className={`size-3.5 text-muted-foreground/60 ${
                refreshAnalytics.isPending ? "animate-spin" : ""
              }`}
            />
          </Button>
        </div>
      </div>
      <div className="h-px bg-editorial-rule mt-4 mb-8" />

      <div
        data-testid="tab-content"
        className={
          isPending
            ? "opacity-70 transition-opacity"
            : "transition-opacity"
        }
      >
        {/* ── Overview Metrics ── */}
        {overviewLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg border border-border/40 bg-card/30 p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="size-7 rounded-md" />
                </div>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-28 mt-2" />
              </div>
            ))}
          </div>
        ) : hasPlatforms ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            <MetricCard
              icon={EyeIcon}
              accent="text-blue-400"
              label="Total Impressions"
              value={formatNumber(combined.total_impressions)}
              sub={`Across ${combined.total_posts} posts`}
            />
            <MetricCard
              icon={HeartIcon}
              accent="text-rose-400"
              label="Engagements"
              value={formatNumber(combined.total_engagements)}
              sub={`${formatEngagementRate(combined.avg_engagement_rate)} avg rate`}
            />
            <MetricCard
              icon={UsersIcon}
              accent="text-emerald-400"
              label="Follower Growth"
              value={
                combined.total_follower_growth >= 0
                  ? `+${formatNumber(combined.total_follower_growth)}`
                  : formatNumber(combined.total_follower_growth)
              }
              sub={`Last ${period.replace("d", " days")}`}
            />
            <MetricCard
              icon={DocumentTextIcon}
              accent="text-primary"
              label="Posts Published"
              value={String(combined.total_posts)}
              sub={`${Object.keys(platforms).length} platform${Object.keys(platforms).length > 1 ? "s" : ""}`}
            />
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border/60 p-8 mb-10 text-center">
            <ChartBarIcon className="size-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground/60">
              No analytics data yet. Publish posts and metrics will appear
              here.
            </p>
            <Button
              asChild
              className="mt-4"
              size="sm"
              variant="coral"
            >
              <Link href={slug ? appUrl.contentNew(slug) : "#"}>
                Create Post
              </Link>
            </Button>
          </div>
        )}

        {/* ── Charts ── */}
        {followerData &&
          Object.keys(followerData.platforms ?? {}).length > 0 && (
            <AnalyticsCharts
              followerData={followerData.platforms}
              period={period}
            />
          )}

        {/* ── Platform Breakdowns + Top Posts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Platform cards */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ChartBarIcon className="size-4 text-primary" />
              <h2 className="text-lg font-normal tracking-tight font-serif">
                Platform breakdown
              </h2>
            </div>
            {overviewLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border/40 bg-card/30 p-5"
                  >
                    <Skeleton className="h-4 w-24 mb-4" />
                    <div className="grid grid-cols-2 gap-3">
                      {Array.from({ length: 4 }).map((_, j) => (
                        <div key={j}>
                          <Skeleton className="h-2.5 w-16 mb-1" />
                          <Skeleton className="h-6 w-12" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : hasPlatforms ? (
              <div className="space-y-3">
                {Object.entries(platforms).map(
                  ([platform, stats]) => (
                    <PlatformBreakdown
                      key={platform}
                      platform={platform}
                      stats={stats as PlatformStats}
                    />
                  ),
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border/40 p-8 text-center">
                <p className="text-sm text-muted-foreground/40">
                  Connect a platform to see breakdowns.
                </p>
              </div>
            )}
          </div>

          {/* Top posts */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ArrowTrendingUpIcon className="size-4 text-amber-400" />
                <h2 className="text-lg font-normal tracking-tight font-serif">
                  Top performing posts
                </h2>
              </div>
            </div>

            {postsLoading ? (
              <div className="rounded-lg border border-border/40 bg-card/30 p-4 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="size-5 rounded shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : topPosts.length > 0 ? (
              <div className="rounded-lg border border-border/60 bg-card/50 divide-y divide-border/40">
                {topPosts.map((post, idx) => (
                  <TopPostRow
                    key={post.publication_id}
                    post={post}
                    rank={idx + 1}
                    slug={slug}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border/40 p-8 text-center">
                <p className="text-sm text-muted-foreground/40">
                  No posts in this period.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Content Breakdown + Best Time Heatmap ── */}
        {topPosts.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            <ContentBreakdown posts={topPosts} />
            <BestTimeHeatmap posts={topPosts} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense>
      <AnalyticsContent />
    </Suspense>
  );
}
