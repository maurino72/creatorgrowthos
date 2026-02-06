"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { usePost, useUpdatePost, useDeletePost, usePublishPost, useClassifyPost, useUpdateClassifications } from "@/lib/queries/posts";
import { INTENTS, CONTENT_TYPES } from "@/lib/ai/taxonomy";
import { useConnections } from "@/lib/queries/connections";
import { useLatestMetrics, usePostMetrics, useRefreshMetrics } from "@/lib/queries/metrics";
import { useImproveContent } from "@/lib/queries/ai";
import { useSignedUrls } from "@/lib/queries/media";
import { ImageUploadZone, type ImageItem } from "@/components/image-upload-zone";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber, formatEngagementRate, formatTimeAgo } from "@/lib/utils/format";

const CHAR_LIMIT = 280;

function getCharColor(count: number): string {
  if (count > CHAR_LIMIT) return "text-red-500";
  if (count >= 260) return "text-yellow-500";
  return "text-muted-foreground";
}

interface MetricEvent {
  id: string;
  impressions?: number;
  likes?: number;
  replies?: number;
  reposts?: number;
  engagement_rate?: number | null;
  hours_since_publish?: number;
  observed_at?: string;
  post_publication_id?: string;
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function MetricsTimeline({ events }: { events: MetricEvent[] }) {
  if (!events || events.length === 0) return null;

  // Sort oldest first for the timeline
  const sorted = [...events].sort(
    (a, b) => new Date(a.observed_at!).getTime() - new Date(b.observed_at!).getTime(),
  );

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Performance over time</p>
      <div className="space-y-1.5">
        {sorted.map((event) => (
          <div
            key={event.id}
            className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-xs"
          >
            <span className="text-muted-foreground">
              {event.hours_since_publish != null
                ? `${event.hours_since_publish}h after publish`
                : formatTimeAgo(event.observed_at)}
            </span>
            <div className="flex items-center gap-3 font-medium">
              <span>{formatNumber(event.impressions)} views</span>
              <span>{event.likes ?? 0} likes</span>
              <span>{event.replies ?? 0} replies</span>
              <span>{event.reposts ?? 0} reposts</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricsSection({ postId }: { postId: string }) {
  const { data: latestMetrics, isLoading: latestLoading } = useLatestMetrics(postId);
  const { data: allMetrics } = usePostMetrics(postId);
  const refreshMetrics = useRefreshMetrics();

  if (latestLoading) {
    return (
      <Card>
        <CardContent className="pt-5 space-y-4">
          <Skeleton className="h-6 w-32" />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasMetrics = latestMetrics && latestMetrics.length > 0;

  // Aggregate latest metrics across publications
  const totals = hasMetrics
    ? (latestMetrics as MetricEvent[]).reduce(
        (acc, m) => ({
          impressions: acc.impressions + (m.impressions ?? 0),
          likes: acc.likes + (m.likes ?? 0),
          replies: acc.replies + (m.replies ?? 0),
          reposts: acc.reposts + (m.reposts ?? 0),
          engagementRate: m.engagement_rate ?? acc.engagementRate,
          observedAt: m.observed_at ?? acc.observedAt,
        }),
        { impressions: 0, likes: 0, replies: 0, reposts: 0, engagementRate: null as number | null, observedAt: null as string | null },
      )
    : null;

  return (
    <Card>
      <CardContent className="pt-5 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Performance</h2>
          <Button
            variant="outline"
            size="xs"
            onClick={() =>
              refreshMetrics.mutate(postId, {
                onSuccess: () => toast.success("Metrics refreshed"),
                onError: () => toast.error("Failed to refresh metrics"),
              })
            }
            disabled={refreshMetrics.isPending}
          >
            Refresh
          </Button>
        </div>

        {!hasMetrics ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Metrics will appear soon after publishing.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <MetricCard
                label="Impressions"
                value={formatNumber(totals!.impressions)}
                sub={totals!.observedAt ? `Updated ${formatTimeAgo(totals!.observedAt)}` : undefined}
              />
              <MetricCard
                label="Engagement"
                value={String(totals!.likes + totals!.replies + totals!.reposts)}
                sub={`${totals!.likes} likes · ${totals!.replies} replies · ${totals!.reposts} reposts`}
              />
              <MetricCard
                label="Engagement Rate"
                value={formatEngagementRate(totals!.engagementRate)}
              />
            </div>

            {allMetrics && allMetrics.length > 1 && (
              <MetricsTimeline events={allMetrics as MetricEvent[]} />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface PostClassification {
  intent: string | null;
  content_type: string | null;
  topics: string[];
  ai_assisted: boolean | null;
}

function ClassificationSection({
  postId,
  classification,
}: {
  postId: string;
  classification: PostClassification;
}) {
  const classifyPost = useClassifyPost();
  const hasClassification = classification.intent !== null;

  return (
    <Card>
      <CardContent className="pt-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight">Classification</h2>
            {hasClassification && classification.ai_assisted && (
              <span className="inline-flex items-center rounded-md bg-foreground/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/70">
                AI
              </span>
            )}
          </div>
          {!hasClassification && (
            <Button
              variant="outline"
              size="xs"
              onClick={() =>
                classifyPost.mutate(postId, {
                  onSuccess: () => toast.success("Post classified"),
                  onError: () => toast.error("Classification failed"),
                })
              }
              disabled={classifyPost.isPending}
            >
              Classify
            </Button>
          )}
        </div>

        {!hasClassification ? (
          <p className="text-sm text-muted-foreground py-2 text-center">
            Not yet classified. Click Classify to analyze this post with AI.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground w-16">Intent</span>
              <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium">
                {classification.intent}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground w-16">Type</span>
              <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium">
                {classification.content_type}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground w-16">Topics</span>
              {classification.topics.map((topic) => (
                <span
                  key={topic}
                  className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
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
  const improveContent = useImproveContent();

  const existingMediaPaths: string[] = post?.media_urls ?? [];
  const { data: signedUrls } = useSignedUrls(existingMediaPaths);

  const [body, setBody] = useState("");
  const [images, setImages] = useState<ImageItem[]>([]);
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

  // Pre-populate images once signed URLs are available
  useEffect(() => {
    if (signedUrls && signedUrls.length > 0 && images.length === 0 && initialized) {
      setImages(
        signedUrls.map((item) => ({
          id: item.path.split("/").pop() ?? item.path,
          path: item.path,
          url: item.url,
        })),
      );
    }
  }, [signedUrls, images.length, initialized]);

  const activeConnections =
    connections?.filter((c) => c.status === "active") ?? [];
  const charCount = body.length;
  const isOverLimit = charCount > CHAR_LIMIT;
  const isReadOnly = post?.status === "published";
  const uploadedPaths = images.filter((i) => !i.uploading).map((i) => i.path);
  const hasUploading = images.some((i) => i.uploading);
  const canSubmit =
    body.trim().length > 0 &&
    !isOverLimit &&
    selectedPlatforms.length > 0 &&
    !updatePost.isPending &&
    !hasUploading;

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
          media_urls: uploadedPaths.length > 0 ? uploadedPaths : null,
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

          {/* Image Upload */}
          {!isReadOnly && (
            <ImageUploadZone
              images={images}
              onChange={setImages}
              disabled={updatePost.isPending}
            />
          )}

          {/* Read-only image display */}
          {isReadOnly && images.length > 0 && (
            <ImageUploadZone
              images={images}
              onChange={() => {}}
              disabled
            />
          )}

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

      {/* Improve Section */}
      {!isReadOnly && (
        <Card className="border-dashed">
          <CardContent className="pt-4 pb-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-foreground/80">AI Improvement</h2>
              <Button
                variant="outline"
                size="xs"
                onClick={() =>
                  improveContent.mutate(body, {
                    onError: (err: Error) => toast.error(err.message),
                  })
                }
                disabled={improveContent.isPending || !body.trim()}
              >
                {improveContent.isPending ? "Improving..." : "Improve"}
              </Button>
            </div>

            {improveContent.isSuccess && improveContent.data && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {(improveContent.data as { overall_assessment: string }).overall_assessment}
                </p>

                <div className="space-y-2">
                  {((improveContent.data as { improvements: { type: string; suggestion: string; example: string }[] }).improvements).map((imp, idx) => (
                    <div
                      key={idx}
                      className="rounded-md border border-border/60 bg-muted/30 p-2.5 space-y-1"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-medium uppercase">
                          {imp.type}
                        </span>
                      </div>
                      <p className="text-xs text-foreground/90">{imp.suggestion}</p>
                      <p className="text-xs italic text-muted-foreground">{imp.example}</p>
                    </div>
                  ))}
                </div>

                {(improveContent.data as { improved_version?: string }).improved_version && (
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => {
                      setBody((improveContent.data as { improved_version: string }).improved_version);
                      toast.success("Improved version applied");
                    }}
                  >
                    Apply Improved Version
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <ClassificationSection
        postId={postId}
        classification={{
          intent: post.intent ?? null,
          content_type: post.content_type ?? null,
          topics: post.topics ?? [],
          ai_assisted: post.ai_assisted ?? false,
        }}
      />

      {post.status === "published" && (
        <MetricsSection postId={postId} />
      )}
    </div>
  );
}
