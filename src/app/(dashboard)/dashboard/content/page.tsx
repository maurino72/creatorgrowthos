"use client";

import { useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { usePlatform } from "@/lib/hooks/use-platform";
import { usePosts, useDeletePost, usePublishPost } from "@/lib/queries/posts";
import { useLatestMetrics } from "@/lib/queries/metrics";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { formatNumber, formatEngagementRate, formatTimeAgo } from "@/lib/utils/format";
import { STATUS_BADGE_STYLES } from "@/lib/ui/badge-styles";

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

function PostMetrics({ postId }: { postId: string }) {
  const { data: metrics } = useLatestMetrics(postId);

  if (!metrics || metrics.length === 0) return null;

  // Aggregate across all publications
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
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground/40 font-mono tabular-nums mt-1">
      <span>{formatNumber(totals.impressions)} views</span>
      <span>{totals.likes} likes · {totals.replies} replies · {totals.reposts} reposts</span>
      <span>{formatEngagementRate(totals.engagementRate)} engagement</span>
      {totals.observedAt && (
        <span>Updated {formatTimeAgo(totals.observedAt)}</span>
      )}
    </div>
  );
}

function PostCard({
  post,
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
}) {
  const router = useRouter();
  const deletePost = useDeletePost();
  const publishPost = usePublishPost();

  const preview =
    post.body.length > 100 ? post.body.slice(0, 100) + "..." : post.body;

  return (
    <div className="group py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-serif leading-snug">{preview}</p>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <StatusBadge status={post.status} />
            <div className="flex items-center gap-1.5 text-muted-foreground">
              {post.post_publications.map((pub) => (
                <PlatformIcon key={pub.platform} platform={pub.platform} />
              ))}
            </div>
            {post.scheduled_at && (
              <span className="text-[11px] text-muted-foreground/40">
                Scheduled{" "}
                {new Date(post.scheduled_at).toLocaleString()}
              </span>
            )}
            {post.published_at && (
              <span className="text-[11px] text-muted-foreground/40">
                Published{" "}
                {new Date(post.published_at).toLocaleString()}
              </span>
            )}
          </div>

          {post.intent && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/50">
                {post.intent}
              </span>
              {post.topics?.map((topic) => (
                <span
                  key={topic}
                  className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/30"
                >
                  {topic}
                </span>
              ))}
            </div>
          )}

          {post.status === "published" && (
            <PostMetrics postId={post.id} />
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {post.status !== "published" && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() =>
                router.push(`/dashboard/content/${post.id}/edit`)
              }
            >
              Edit
            </Button>
          )}
          {post.status === "failed" && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() =>
                publishPost.mutate(post.id, {
                  onSuccess: () => toast.success("Post published!"),
                  onError: () => toast.error("Retry failed"),
                })
              }
              loading={publishPost.isPending}
            >
              Retry
            </Button>
          )}
          <Button
            variant="ghost"
            size="xs"
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
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

function PostSkeleton() {
  return (
    <div data-testid="post-skeleton" className="py-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-4 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function ContentPageInner() {
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);
  const [isPending, startTransition] = useTransition();
  const { platform } = usePlatform();
  const platformFilter = platform ?? undefined;
  const filters: Record<string, string | undefined> = {};
  if (activeTab) filters.status = activeTab;
  if (platformFilter) filters.platform = platformFilter;
  const hasFilters = Object.values(filters).some(Boolean);
  const { data: posts, isLoading } = usePosts(
    hasFilters ? filters : undefined,
  );

  const emptyKey = activeTab ?? "all";

  return (
    <div className="mx-auto max-w-3xl">
      {/* ── Masthead ── */}
      <div className="flex items-end justify-between">
        <h1 className="text-3xl font-normal tracking-tight font-serif">
          Content
        </h1>
        <Link
          href="/dashboard/content/new"
          className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60 hover:text-foreground transition-colors pb-1"
        >
          New Post
        </Link>
      </div>
      <div className="h-px bg-editorial-rule mt-4 mb-8" />

      {/* ── Status Tabs ── */}
      <div className="flex items-center gap-6 mb-8">
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
        <div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <PostSkeleton />
              {i < 2 && <div className="h-px bg-editorial-rule-subtle" />}
            </div>
          ))}
        </div>
      ) : posts && posts.length > 0 ? (
        <div>
          {posts.map((post: {
            id: string;
            body: string;
            status: string;
            scheduled_at?: string | null;
            published_at?: string | null;
            created_at: string;
            post_publications: { platform: string; status: string }[];
          }, idx: number) => (
            <div key={post.id}>
              <PostCard post={post} />
              {idx < posts.length - 1 && (
                <div className="h-px bg-editorial-rule-subtle" />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground/60">
            {EMPTY_MESSAGES[emptyKey]}
          </p>
          {emptyKey === "all" && (
            <Button asChild className="mt-4" size="sm">
              <Link href="/dashboard/content/new">Create Post</Link>
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
