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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber, formatEngagementRate, formatTimeAgo } from "@/lib/utils/format";

const CHAR_LIMIT = 280;

function getCharColor(count: number): string {
  if (count > CHAR_LIMIT) return "text-red-500";
  if (count >= 260) return "text-yellow-500";
  return "text-muted-foreground/50";
}

function getBarColor(count: number): string {
  if (count > CHAR_LIMIT) return "#ef4444";
  if (count >= 260) return "#eab308";
  return "var(--foreground)";
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
    <div>
      <p className="text-[10px] uppercase tracking-[0.2em] text-editorial-label">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-light tracking-tight font-mono tabular-nums">
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground/40">{sub}</p>}
    </div>
  );
}

function MetricsTimeline({ events }: { events: MetricEvent[] }) {
  if (!events || events.length === 0) return null;

  const sorted = [...events].sort(
    (a, b) => new Date(a.observed_at!).getTime() - new Date(b.observed_at!).getTime(),
  );

  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.2em] text-editorial-label mb-3">
        Performance over time
      </p>
      <div className="space-y-0">
        {sorted.map((event) => (
          <div
            key={event.id}
            className="flex items-center justify-between py-2"
          >
            <span className="text-[11px] text-muted-foreground/40">
              {event.hours_since_publish != null
                ? `${event.hours_since_publish}h after publish`
                : formatTimeAgo(event.observed_at)}
            </span>
            <div className="flex items-center gap-3 text-[11px] font-mono tabular-nums">
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
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="grid grid-cols-3 gap-8">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </div>
    );
  }

  const hasMetrics = latestMetrics && latestMetrics.length > 0;

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
    <div>
      <div className="flex items-end justify-between mb-1">
        <h2 className="text-xl font-normal tracking-tight font-serif">
          Performance
        </h2>
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
      <div className="h-px bg-editorial-rule mb-6" />

      {!hasMetrics ? (
        <p className="text-sm text-muted-foreground/50 py-4">
          Metrics will appear soon after publishing.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-8 mb-8">
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
            <>
              <div className="h-px bg-editorial-rule-subtle mb-6" />
              <MetricsTimeline events={allMetrics as MetricEvent[]} />
            </>
          )}
        </>
      )}
    </div>
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
    <div>
      <div className="flex items-end justify-between mb-1">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-normal tracking-tight font-serif">
            Classification
          </h2>
          {hasClassification && classification.ai_assisted && (
            <span className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground/40">
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
      <div className="h-px bg-editorial-rule mb-6" />

      {!hasClassification ? (
        <p className="text-sm text-muted-foreground/50 py-2">
          Not yet classified. Click Classify to analyze this post with AI.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase tracking-[0.2em] text-editorial-label w-14">Intent</span>
            <span className="text-sm">{classification.intent}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase tracking-[0.2em] text-editorial-label w-14">Type</span>
            <span className="text-sm">{classification.content_type}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase tracking-[0.2em] text-editorial-label w-14">Topics</span>
            <div className="flex items-center gap-2">
              {classification.topics.map((topic) => (
                <span
                  key={topic}
                  className="text-sm text-muted-foreground/70"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
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
      <div className="mx-auto max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <div className="h-px bg-editorial-rule mt-4 mb-8" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-32" />
        </div>
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
    <div className="mx-auto max-w-2xl">
      {/* ── Masthead ── */}
      <div className="flex items-end justify-between mb-4">
        <h1 className="text-3xl font-normal tracking-tight font-serif">
          Edit Post
        </h1>
        <Link
          href="/dashboard/content"
          className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60 hover:text-foreground transition-colors pb-1"
        >
          Cancel
        </Link>
      </div>

      {isReadOnly && (
        <p className="text-xs text-muted-foreground/40 mb-2">
          This post is published and cannot be edited.
        </p>
      )}

      <div className="h-px bg-editorial-rule mb-10" />

      {/* ── Writing Surface ── */}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What's on your mind?"
        rows={6}
        disabled={isReadOnly}
        className="w-full resize-none bg-transparent border-0 text-[19px] leading-[1.85] placeholder:text-muted-foreground/25 focus:outline-none px-0 min-h-[180px] font-serif disabled:cursor-not-allowed disabled:opacity-50"
      />

      {/* ── Character Gauge ── */}
      <div className="flex items-center gap-4 mt-3 mb-8">
        <div className="flex-1 h-px bg-foreground/8 relative overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 transition-all duration-500 ease-out"
            style={{
              width: `${Math.min((charCount / CHAR_LIMIT) * 100, 100)}%`,
              backgroundColor: getBarColor(charCount),
              opacity: charCount > 0 ? 0.5 : 0,
            }}
          />
        </div>
        <span
          className={`text-[11px] font-mono tabular-nums shrink-0 ${getCharColor(charCount)}`}
        >
          {charCount} / {CHAR_LIMIT}
        </span>
      </div>

      {/* ── Image Upload ── */}
      {!isReadOnly && (
        <div className="mb-8">
          <ImageUploadZone
            images={images}
            onChange={setImages}
            disabled={updatePost.isPending}
          />
        </div>
      )}

      {isReadOnly && images.length > 0 && (
        <div className="mb-8">
          <ImageUploadZone
            images={images}
            onChange={() => {}}
            disabled
          />
        </div>
      )}

      {/* ── Platforms ── */}
      {!isReadOnly && (
        <div className="mb-8">
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/50 mb-3">
            Platforms
          </p>
          <div className="flex flex-wrap gap-2">
            {activeConnections.map((conn) => (
              <label
                key={conn.platform}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded border px-3 py-1.5 text-sm transition-all duration-200 select-none ${
                  selectedPlatforms.includes(conn.platform)
                    ? "border-primary/40 text-foreground"
                    : "border-input text-muted-foreground/50 hover:border-input hover:text-foreground/80"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedPlatforms.includes(conn.platform)}
                  onChange={() => togglePlatform(conn.platform)}
                  className="sr-only"
                />
                {selectedPlatforms.includes(conn.platform) && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M3 7l3 3 5-5" />
                  </svg>
                )}
                <span className="capitalize">{conn.platform}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* ── Schedule ── */}
      {!isReadOnly && (
        <div className="mb-10">
          <label className="flex items-center gap-2.5 text-sm cursor-pointer group">
            <input
              type="checkbox"
              checked={scheduleEnabled}
              onChange={(e) => setScheduleEnabled(e.target.checked)}
              className="rounded border-input"
            />
            <span className="text-muted-foreground/60 group-hover:text-foreground transition-colors font-medium">
              Schedule for later
            </span>
          </label>

          {scheduleEnabled && (
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="mt-3 ml-7 rounded border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-ring/50"
            />
          )}
        </div>
      )}

      {/* ── Action Bar ── */}
      <div className="h-px bg-foreground/20" />
      <div className="flex items-center gap-4 pt-6 pb-2">
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

      {/* ── AI Improvement ── */}
      {!isReadOnly && (
        <div className="mt-12">
          <div className="flex items-end justify-between mb-1">
            <h2 className="text-xl font-normal tracking-tight font-serif">
              AI Improvement
            </h2>
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
          <div className="h-px bg-editorial-rule mb-6" />

          {improveContent.isSuccess && improveContent.data && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground/60 leading-relaxed">
                {(improveContent.data as { overall_assessment: string }).overall_assessment}
              </p>

              <div className="space-y-3">
                {((improveContent.data as { improvements: { type: string; suggestion: string; example: string }[] }).improvements).map((imp, idx) => (
                  <div key={idx} className="py-3">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/40 mb-1">
                      {imp.type}
                    </p>
                    <p className="text-sm text-foreground/90">{imp.suggestion}</p>
                    <p className="text-sm italic text-muted-foreground/50 mt-1 font-serif">
                      {imp.example}
                    </p>
                    {idx < ((improveContent.data as { improvements: { type: string }[] }).improvements.length - 1) && (
                      <div className="h-px bg-editorial-rule-subtle mt-3" />
                    )}
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
        </div>
      )}

      {/* ── Classification ── */}
      <div className="mt-12">
        <ClassificationSection
          postId={postId}
          classification={{
            intent: post.intent ?? null,
            content_type: post.content_type ?? null,
            topics: post.topics ?? [],
            ai_assisted: post.ai_assisted ?? false,
          }}
        />
      </div>

      {/* ── Metrics ── */}
      {post.status === "published" && (
        <div className="mt-12">
          <MetricsSection postId={postId} />
        </div>
      )}
    </div>
  );
}
