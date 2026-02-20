"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { usePlatform } from "@/lib/hooks/use-platform";
import { appUrl } from "@/lib/urls";
import { usePostAnalytics } from "@/lib/queries/analytics";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber, formatEngagementRate, formatTimeAgo } from "@/lib/utils/format";
import {
  EyeIcon,
  HeartIcon,
  ChatBubbleLeftEllipsisIcon,
  ArrowUpRightIcon,
  BookmarkIcon,
  ArrowLeftIcon,
  PlayIcon,
  ClockIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

const PostMetricsChart = dynamic(() => import("./chart"), {
  ssr: false,
  loading: () => (
    <div className="rounded-lg border border-border/40 bg-card/30 p-5">
      <Skeleton className="h-4 w-40 mb-4" />
      <Skeleton className="h-52 w-full" />
    </div>
  ),
});

const PLATFORM_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  twitter: "X (Twitter)",
};

// ─── MetricTile ─────────────────────────────────────────────────────────

function MetricTile({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number | null;
  icon: typeof EyeIcon;
  accent: string;
}) {
  if (value === null || value === undefined) return null;

  return (
    <div className="rounded-lg border border-border/60 bg-card/50 p-4 transition-all hover:border-border hover:bg-card">
      <div className="flex items-center gap-2 mb-2">
        <div className={`rounded-md bg-card p-1 ${accent}`}>
          <Icon className="size-3.5" />
        </div>
        <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/60">
          {label}
        </p>
      </div>
      <p className="text-2xl font-light tracking-tight font-mono tabular-nums">
        {typeof value === "number" ? formatNumber(value) : value}
      </p>
    </div>
  );
}

// ─── PostAnalyticsContent ───────────────────────────────────────────────

function PostAnalyticsContent() {
  const params = useParams();
  const publicationId = params.id as string;
  const { slug } = usePlatform();

  const { data, isLoading, isError } = usePostAnalytics(publicationId);

  if (isLoading) {
    return (
      <div className="w-full">
        <Skeleton className="h-6 w-32 mb-6" />
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-full mb-8" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border/40 bg-card/30 p-4">
              <Skeleton className="h-3 w-16 mb-2" />
              <Skeleton className="h-7 w-12" />
            </div>
          ))}
        </div>
        <Skeleton className="h-52 w-full" />
      </div>
    );
  }

  if (isError || !data?.publication) {
    return (
      <div className="w-full">
        <Link
          href={slug ? appUrl.analytics(slug) : "#"}
          className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.15em] text-muted-foreground/50 hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeftIcon className="size-3" />
          Back to Analytics
        </Link>
        <div className="rounded-lg border border-dashed border-border/60 p-8 text-center">
          <p className="text-sm text-muted-foreground/60">
            Post not found or an error occurred.
          </p>
        </div>
      </div>
    );
  }

  const { publication, snapshots, latest } = data;
  const post = publication.posts as unknown as {
    id: string;
    body: string;
    content_type: string | null;
    tags: string[];
    created_at: string;
  };
  const platformLabel = PLATFORM_LABELS[publication.platform] ?? publication.platform;

  // Compute engagement rate
  const impressions = latest?.impressions ?? 0;
  const engagements =
    (latest?.reactions ?? 0) +
    (latest?.comments ?? 0) +
    (latest?.shares ?? 0);
  const engagementRate =
    impressions > 0
      ? Math.round((engagements / impressions) * 10000) / 100
      : 0;

  const hasVideoMetrics =
    latest?.video_plays !== null && latest?.video_plays !== undefined;

  return (
    <div className="w-full">
      {/* ── Back link ── */}
      <Link
        href={slug ? appUrl.analytics(slug) : "#"}
        className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.15em] text-muted-foreground/50 hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeftIcon className="size-3" />
        Back to Analytics
      </Link>

      {/* ── Post Header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/50 bg-muted px-2 py-0.5 rounded">
            {platformLabel}
          </span>
          {post.content_type && (
            <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/40">
              {post.content_type}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground/30">
            Published {formatTimeAgo(publication.published_at)}
          </span>
        </div>
        <p className="text-lg leading-relaxed font-serif">{post.body}</p>
        {post.tags && post.tags.length > 0 && (
          <div className="flex items-center gap-1.5 mt-3">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] text-primary/70 bg-primary/5 px-2 py-0.5 rounded"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="h-px bg-editorial-rule mb-8" />

      {/* ── Metric Tiles ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-8">
        <MetricTile
          icon={EyeIcon}
          accent="text-blue-400"
          label="Impressions"
          value={latest?.impressions}
        />
        <MetricTile
          icon={HeartIcon}
          accent="text-rose-400"
          label="Reactions"
          value={latest?.reactions}
        />
        <MetricTile
          icon={ChatBubbleLeftEllipsisIcon}
          accent="text-amber-400"
          label="Comments"
          value={latest?.comments}
        />
        <MetricTile
          icon={ArrowUpRightIcon}
          accent="text-emerald-400"
          label="Shares"
          value={latest?.shares}
        />
        <MetricTile
          icon={BookmarkIcon}
          accent="text-purple-400"
          label="Bookmarks"
          value={latest?.bookmarks}
        />
        <div className="rounded-lg border border-border/60 bg-card/50 p-4 transition-all hover:border-border hover:bg-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-md bg-card p-1 text-primary">
              <EyeIcon className="size-3.5" />
            </div>
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/60">
              Engagement Rate
            </p>
          </div>
          <p className="text-2xl font-light tracking-tight font-mono tabular-nums">
            {formatEngagementRate(engagementRate)}
          </p>
        </div>
      </div>

      {/* ── Video Metrics (if applicable) ── */}
      {hasVideoMetrics && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <PlayIcon className="size-4 text-primary" />
            <h2 className="text-lg font-normal tracking-tight font-serif">
              Video metrics
            </h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
            <MetricTile
              icon={PlayIcon}
              accent="text-blue-400"
              label="Video Plays"
              value={latest?.video_plays}
            />
            <MetricTile
              icon={ClockIcon}
              accent="text-amber-400"
              label="Watch Time"
              value={
                latest?.video_watch_time_ms
                  ? `${Math.round(latest.video_watch_time_ms / 1000)}s`
                  : null
              }
            />
            <MetricTile
              icon={UsersIcon}
              accent="text-emerald-400"
              label="Unique Viewers"
              value={latest?.video_unique_viewers}
            />
          </div>
        </>
      )}

      {/* ── Metrics Timeline Chart ── */}
      {snapshots && snapshots.length > 1 && (
        <PostMetricsChart snapshots={snapshots} />
      )}

      {/* ── Snapshots Count ── */}
      <div className="mt-6 text-[11px] text-muted-foreground/40 text-center">
        {snapshots?.length ?? 0} data points collected
        {latest?.fetched_at &&
          ` · Last updated ${formatTimeAgo(latest.fetched_at)}`}
      </div>
    </div>
  );
}

export default function PostAnalyticsPage() {
  return (
    <Suspense>
      <PostAnalyticsContent />
    </Suspense>
  );
}
