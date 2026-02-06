"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { usePlatform } from "@/lib/hooks/use-platform";
import { usePosts, useDeletePost, usePublishPost } from "@/lib/queries/posts";
import { useLatestMetrics } from "@/lib/queries/metrics";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
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
    <Card className="group transition-colors hover:border-foreground/20">
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm leading-relaxed">{preview}</p>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={post.status} />
              <div className="flex items-center gap-1.5 text-muted-foreground">
                {post.post_publications.map((pub) => (
                  <PlatformIcon key={pub.platform} platform={pub.platform} />
                ))}
              </div>
              {post.scheduled_at && (
                <span className="text-xs text-muted-foreground">
                  Scheduled{" "}
                  {new Date(post.scheduled_at).toLocaleString()}
                </span>
              )}
              {post.published_at && (
                <span className="text-xs text-muted-foreground">
                  Published{" "}
                  {new Date(post.published_at).toLocaleString()}
                </span>
              )}
            </div>
            {post.intent && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px] font-medium">
                  {post.intent}
                </span>
                {post.topics?.map((topic) => (
                  <span
                    key={topic}
                    className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
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

          <div className="flex shrink-0 items-center gap-1">
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
                disabled={publishPost.isPending}
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
              disabled={deletePost.isPending}
            >
              Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PostSkeleton() {
  return (
    <Card data-testid="post-skeleton">
      <CardContent className="pt-5">
        <div className="space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-4 rounded-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ContentPageInner() {
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Content</h1>
          <p className="text-sm text-muted-foreground">
            Create, schedule, and manage your posts.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/content/new">New Post</Link>
        </Button>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-1 border-b border-border pb-px">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={`rounded-t-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? "border-b-2 border-foreground text-foreground"
                : "text-muted-foreground hover:text-foreground"
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
            <PostSkeleton key={i} />
          ))}
        </div>
      ) : posts && posts.length > 0 ? (
        <div className="space-y-3">
          {posts.map((post: {
            id: string;
            body: string;
            status: string;
            scheduled_at?: string | null;
            published_at?: string | null;
            created_at: string;
            post_publications: { platform: string; status: string }[];
          }) => (
            <PostCard key={post.id} post={post} />
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
              <path d="M12 5v14M5 12h14" />
            </svg>
          </div>
          <p className="mt-4 text-sm font-medium">
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
  );
}

export default function ContentPage() {
  return (
    <Suspense>
      <ContentPageInner />
    </Suspense>
  );
}
