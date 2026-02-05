"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { usePost, useUpdatePost, useDeletePost, usePublishPost } from "@/lib/queries/posts";
import { useConnections } from "@/lib/queries/connections";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const CHAR_LIMIT = 280;

function getCharColor(count: number): string {
  if (count > CHAR_LIMIT) return "text-red-500";
  if (count >= 260) return "text-yellow-500";
  return "text-muted-foreground";
}

export default function EditPostPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const postId = params.id;

  const { data: post, isLoading: postLoading } = usePost(postId);
  const updatePost = useUpdatePost();
  const deletePost = useDeletePost();
  const publishPost = usePublishPost();
  const { data: connections } = useConnections();

  const [body, setBody] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (post && !initialized) {
      setBody(post.body ?? "");
      setSelectedPlatforms(
        post.post_publications?.map(
          (p: { platform: string }) => p.platform,
        ) ?? [],
      );
      if (post.scheduled_at) {
        setScheduleEnabled(true);
        setScheduledAt(
          new Date(post.scheduled_at).toISOString().slice(0, 16),
        );
      }
      setInitialized(true);
    }
  }, [post, initialized]);

  const activeConnections =
    connections?.filter((c) => c.status === "active") ?? [];
  const charCount = body.length;
  const isOverLimit = charCount > CHAR_LIMIT;
  const isReadOnly = post?.status === "published";
  const canSubmit =
    body.trim().length > 0 &&
    !isOverLimit &&
    selectedPlatforms.length > 0 &&
    !updatePost.isPending;

  function togglePlatform(platform: string) {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform],
    );
  }

  function handleSave() {
    updatePost.mutate(
      {
        id: postId,
        data: {
          body,
          platforms: selectedPlatforms as ("twitter" | "linkedin" | "threads")[],
          scheduled_at: scheduleEnabled ? new Date(scheduledAt).toISOString() : null,
        },
      },
      {
        onSuccess: () => {
          toast.success("Post updated");
          router.push("/dashboard/content");
        },
        onError: () => toast.error("Failed to update post"),
      },
    );
  }

  function handleDelete() {
    if (!window.confirm("Delete this post?")) return;
    deletePost.mutate(postId, {
      onSuccess: () => {
        toast.success("Post deleted");
        router.push("/dashboard/content");
      },
      onError: () => toast.error("Failed to delete post"),
    });
  }

  function handleRetry() {
    publishPost.mutate(postId, {
      onSuccess: () => {
        toast.success("Post published!");
        router.push("/dashboard/content");
      },
      onError: () => toast.error("Retry failed"),
    });
  }

  if (postLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="pt-5 space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-32" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <p className="text-sm text-muted-foreground">Post not found.</p>
        <Button asChild className="mt-4" size="sm" variant="outline">
          <Link href="/dashboard/content">Back to Content</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Edit Post</h1>
          <p className="text-sm text-muted-foreground">
            {isReadOnly
              ? "This post is published and cannot be edited."
              : "Update your post content and settings."}
          </p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/content">Cancel</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="pt-5 space-y-5">
          {/* Text Area */}
          <div className="space-y-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What's on your mind?"
              rows={5}
              disabled={isReadOnly}
              className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
            <div className="flex justify-end">
              <span className={`text-xs font-medium ${getCharColor(charCount)}`}>
                {charCount} / {CHAR_LIMIT}
              </span>
            </div>
          </div>

          {/* Platform Selector */}
          {!isReadOnly && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Platforms</label>
              <div className="flex flex-wrap gap-2">
                {activeConnections.map((conn) => (
                  <label
                    key={conn.platform}
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                      selectedPlatforms.includes(conn.platform)
                        ? "border-foreground bg-foreground/5"
                        : "border-border hover:border-foreground/30"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPlatforms.includes(conn.platform)}
                      onChange={() => togglePlatform(conn.platform)}
                      className="sr-only"
                    />
                    <span className="capitalize">{conn.platform}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Schedule Toggle */}
          {!isReadOnly && (
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={scheduleEnabled}
                  onChange={(e) => setScheduleEnabled(e.target.checked)}
                  className="rounded border-input"
                />
                <span className="font-medium">Schedule for later</span>
              </label>

              {scheduleEnabled && (
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 border-t border-border pt-4">
            {!isReadOnly && (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!canSubmit}
              >
                Save Changes
              </Button>
            )}

            {post.status === "failed" && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRetry}
                disabled={publishPost.isPending}
              >
                Retry Publish
              </Button>
            )}

            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deletePost.isPending}
            >
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
