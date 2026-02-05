"use client";

import { useState } from "react";
import Link from "next/link";
import { useDashboardMetrics, useTopPosts } from "@/lib/queries/metrics";
import { usePosts } from "@/lib/queries/posts";
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
    </div>
  );
}
