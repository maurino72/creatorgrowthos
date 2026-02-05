"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { usePosts, useDeletePost, usePublishPost } from "@/lib/queries/posts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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

const STATUS_STYLES: Record<string, string> = {
  draft:
    "bg-zinc-100 text-zinc-700 ring-zinc-500/20 dark:bg-zinc-500/10 dark:text-zinc-400 dark:ring-zinc-500/20",
  scheduled:
    "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20",
  published:
    "bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-500/10 dark:text-green-400 dark:ring-green-500/20",
  failed:
    "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20",
};

function PlatformIcon({ platform }: { platform: string }) {
  if (platform === "twitter") {
    return (
      <span data-testid="platform-twitter" title="Twitter">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </span>
    );
  }
  if (platform === "linkedin") {
    return (
      <span data-testid="platform-linkedin" title="LinkedIn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      </span>
    );
  }
  if (platform === "threads") {
    return (
      <span data-testid="platform-threads" title="Threads">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.187.408-2.26 1.33-3.017.88-.724 2.104-1.139 3.546-1.206 1.048-.048 2.016.04 2.907.256-.02-.96-.175-1.71-.467-2.25-.387-.712-1.028-1.073-1.907-1.073h-.068c-.66.024-1.2.222-1.607.59-.39.354-.606.826-.643 1.404l-2.113-.108c.078-1.18.568-2.134 1.416-2.762.79-.585 1.818-.895 2.972-.895h.09c1.565.04 2.746.627 3.508 1.746.56.82.874 1.922.937 3.271.29.13.565.272.826.427 1.105.658 1.946 1.578 2.426 2.66.768 1.731.812 4.623-1.315 6.704-1.786 1.749-4.004 2.547-7.172 2.573z" />
        </svg>
      </span>
    );
  }
  return null;
}

function StatusBadge({ status }: { status: string }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[status] ?? ""}`}
    >
      {label}
    </span>
  );
}

function PostCard({
  post,
}: {
  post: {
    id: string;
    body: string;
    status: string;
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

export default function ContentPage() {
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);
  const { data: posts, isLoading } = usePosts(
    activeTab ? { status: activeTab } : undefined,
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
