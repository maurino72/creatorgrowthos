"use client";

import { useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { usePlatform } from "@/lib/hooks/use-platform";
import { appUrl } from "@/lib/urls";
import { usePosts, useDeletePost, usePublishPost } from "@/lib/queries/posts";
import { useLatestMetricsBatch } from "@/lib/queries/metrics";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { formatNumber, formatEngagementRate, formatTimeAgo } from "@/lib/utils/format";
import { STATUS_BADGE_STYLES } from "@/lib/ui/badge-styles";
import { PencilSquareIcon, TrashIcon, ArrowPathIcon, PlusIcon, ClockIcon } from "@heroicons/react/24/outline";

const STATUS_TABS = [
  { label: "All", value: undefined },
  { label: "Drafts", value: "draft" },
  { label: "Scheduled", value: "scheduled" },
  { label: "Published", value: "published" },
  { label: "Failed", value: "failed" },
] as const;

const EMPTY_MESSAGES: Record<string, string> = {
  all: "Create your first post",
  draft: "No drafts. Start writing!",
  scheduled: "Nothing scheduled. Plan ahead!",
  published: "No posts published yet",
  failed: "All clear! No failed posts",
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_BADGE_STYLES[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${style?.className ?? ""}`}
    >
      {style?.label ?? status}
    </span>
  );
}

function PostMetrics({ metrics }: { metrics: Array<{ impressions?: number; likes?: number; replies?: number; reposts?: number; engagement_rate?: number | null; observed_at?: string }> | undefined }) {
  if (!metrics || metrics.length === 0) return null;

  const totals = metrics.reduce(
    (acc: { impressions: number; likes: number; replies: number; reposts: number; engagementRate: number | null; observedAt: string | null }, m: { impressions?: number; likes?: number; replies?: number; reposts?: number; engagement_rate?: number | null; observed_at?: string }) => ({
      impressions: acc.impressions + (m.impressions ?? 0),
      likes: acc.likes + (m.likes ?? 0),
      replies: acc.replies + (m.replies ?? 0),
      reposts: acc.reposts + (m.reposts ?? 0),
      engagementRate: m.engagement_rate ?? acc.engagementRate,
      observedAt: m.observed_at ?? acc.observedAt,
    }),
    { impressions: 0, likes: 0, replies: 0, reposts: 0, engagementRate: null, observedAt: null },
  );

  return (
    <div className="flex items-center gap-4 pt-3 mt-3 border-t border-border/50">
      <MetricPill label="Views" value={formatNumber(totals.impressions)} />
      <MetricPill label="Likes" value={String(totals.likes)} />
      <MetricPill label="Replies" value={String(totals.replies)} />
      <MetricPill label="Reposts" value={String(totals.reposts)} />
      <span className="ml-auto text-[11px] font-mono text-muted-foreground/50">
        {formatEngagementRate(totals.engagementRate)} eng.
      </span>
      {totals.observedAt && (
        <span className="text-[10px] text-muted-foreground/30">
          {formatTimeAgo(totals.observedAt)}
        </span>
      )}
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] font-mono tabular-nums text-foreground/80">{value}</span>
      <span className="text-[10px] text-muted-foreground/40">{label}</span>
    </div>
  );
}

function PostCard({
  post,
  metrics,
}: {
  post: {
    id: string;
    body: string;
    status: string;
    intent?: string | null;
    content_type?: string | null;
    topics?: string[] | null;
    scheduled_at?: string | null;
    published_at?: string | null;
    created_at: string;
    post_publications: { platform: string; status: string }[];
  };
  metrics?: Array<{ impressions?: number; likes?: number; replies?: number; reposts?: number; engagement_rate?: number | null; observed_at?: string }>;
}) {
  const router = useRouter();
  const { slug } = usePlatform();
  const deletePost = useDeletePost();
  const publishPost = usePublishPost();

  const preview =
    post.body.length > 140 ? post.body.slice(0, 140) + "..." : post.body;

  const isScheduled = !!post.scheduled_at && post.status === "scheduled";
  const dateText = post.published_at
    ? `Published ${formatTimeAgo(post.published_at)}`
    : post.scheduled_at
      ? new Date(post.scheduled_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
      : `Created ${formatTimeAgo(post.created_at)}`;

  return (
    <div
      className="group rounded-lg border border-border/60 bg-card/50 p-5 transition-all hover:border-border hover:bg-card hover:shadow-sm cursor-pointer"
      style={{ contentVisibility: "auto", containIntrinsicSize: "0 140px" }}
      onClick={() => router.push(
        post.status === "published"
          ? `${slug ? appUrl.contentEdit(slug, post.id) : "#"}`
          : `${slug ? appUrl.contentEdit(slug, post.id) : "#"}`
      )}
    >
      {/* ── Top row: status + platforms + date + actions ── */}
      <div className="flex items-center gap-2 mb-3">
        <StatusBadge status={post.status} />
        <div className="flex items-center gap-1.5 text-muted-foreground/60">
          {post.post_publications.map((pub) => (
            <PlatformIcon key={pub.platform} platform={pub.platform} size={13} />
          ))}
        </div>
        {isScheduled ? (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-info-muted px-2 py-0.5 text-[11px] text-info">
            <ClockIcon className="size-3" />
            {dateText}
          </span>
        ) : (
          <span className="ml-auto text-[11px] text-muted-foreground/40">{dateText}</span>
        )}
        {/* ── Actions ── */}
        <div
          className="flex items-center gap-0.5 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {post.status !== "published" && (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Edit post"
              onClick={() =>
                router.push(`${slug ? appUrl.contentEdit(slug, post.id) : "#"}`)
              }
            >
              <PencilSquareIcon className="size-3.5 text-primary" />
            </Button>
          )}
          {post.status === "failed" && (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Retry publish"
              onClick={() =>
                publishPost.mutate(post.id, {
                  onSuccess: () => toast.success("Post published!"),
                  onError: () => toast.error("Retry failed"),
                })
              }
              loading={publishPost.isPending}
            >
              <ArrowPathIcon className="size-3.5 text-warning" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Delete post"
            className="hover:bg-destructive/10"
            onClick={() => {
              if (window.confirm("Delete this post?")) {
                deletePost.mutate(post.id, {
                  onSuccess: () => toast.success("Post deleted"),
                  onError: () => toast.error("Failed to delete post"),
                });
              }
            }}
            loading={deletePost.isPending}
          >
            <TrashIcon className="size-3.5 text-destructive" />
          </Button>
        </div>
      </div>

      {/* ── Body ── */}
      <p className="text-[15px] leading-relaxed text-foreground/90">{preview}</p>

      {/* ── Classification tags ── */}
      {(post.intent || (post.topics && post.topics.length > 0)) && (
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          {post.intent && (
            <span className="rounded-md bg-primary/8 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-primary/70">
              {post.intent.replace(/_/g, " ")}
            </span>
          )}
          {post.content_type && (
            <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground/60">
              {post.content_type.replace(/_/g, " ")}
            </span>
          )}
          {post.topics?.map((topic) => (
            <span
              key={topic}
              className="rounded-md bg-muted/50 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground/40"
            >
              {topic}
            </span>
          ))}
        </div>
      )}

      {/* ── Metrics (published only) ── */}
      {post.status === "published" && (
        <PostMetrics metrics={metrics} />
      )}

    </div>
  );
}

function PostSkeleton() {
  return (
    <div data-testid="post-skeleton" className="rounded-lg border border-border/40 bg-card/30 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-3.5 w-3.5 rounded-full" />
        <Skeleton className="ml-auto h-3 w-24" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="flex items-center gap-1.5 mt-3">
        <Skeleton className="h-4 w-14 rounded-md" />
        <Skeleton className="h-4 w-12 rounded-md" />
      </div>
    </div>
  );
}

function ContentPageInner() {
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);
  const [isPending, startTransition] = useTransition();
  const { platform, slug } = usePlatform();
  const platformFilter = platform ?? undefined;
  const filters: Record<string, string | undefined> = {};
  if (activeTab) filters.status = activeTab;
  if (platformFilter) filters.platform = platformFilter;
  const hasFilters = Object.values(filters).some(Boolean);
  const { data: posts, isLoading } = usePosts(
    hasFilters ? filters : undefined,
  );

  // Batch fetch latest metrics for all published posts (eliminates N+1)
  const publishedPostIds = (posts ?? [])
    .filter((p: { status: string }) => p.status === "published")
    .map((p: { id: string }) => p.id);
  const { data: batchMetrics } = useLatestMetricsBatch(publishedPostIds);

  const emptyKey = activeTab ?? "all";

  return (
    <div className="w-full">
      {/* ── Masthead ── */}
      <div className="flex items-end justify-between">
        <h1 className="text-3xl font-normal tracking-tight font-serif">
          Content
        </h1>
        <Button asChild variant="coral" size="sm">
          <Link href={slug ? appUrl.contentNew(slug) : "#"}>
            <PlusIcon className="size-4" />
            New Post
          </Link>
        </Button>
      </div>
      <div className="h-px bg-editorial-rule mt-4 mb-8" />

      {/* ── Status Tabs ── */}
      <div className="flex items-center gap-6 mb-6">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => startTransition(() => setActiveTab(tab.value))}
            className={`text-[11px] uppercase tracking-[0.15em] pb-1 transition-colors border-b ${
              activeTab === tab.value
                ? "text-foreground border-foreground/60"
                : "text-muted-foreground/40 border-transparent hover:text-foreground/70"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div data-testid="tab-content" className={isPending ? "opacity-70 transition-opacity" : "transition-opacity"}>
      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <PostSkeleton key={i} />
          ))}
        </div>
      ) : posts && posts.length > 0 ? (
        <div className="grid gap-3">
          {posts.map((post: {
            id: string;
            body: string;
            status: string;
            intent?: string | null;
            content_type?: string | null;
            topics?: string[] | null;
            scheduled_at?: string | null;
            published_at?: string | null;
            created_at: string;
            post_publications: { platform: string; status: string }[];
          }) => (
            <PostCard key={post.id} post={post} metrics={batchMetrics?.[post.id]} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border/60 py-16 text-center">
          <p className="text-sm text-muted-foreground/60">
            {EMPTY_MESSAGES[emptyKey]}
          </p>
          {emptyKey === "all" && (
            <Button asChild className="mt-4" size="sm" variant="coral">
              <Link href={slug ? appUrl.contentNew(slug) : "#"}>Create Post</Link>
            </Button>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

export default function ContentPage() {
  return (
    <Suspense>
      <ContentPageInner />
    </Suspense>
  );
}
