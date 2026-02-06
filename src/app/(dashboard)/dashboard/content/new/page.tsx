"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useCreatePost } from "@/lib/queries/posts";
import { useConnections } from "@/lib/queries/connections";
import { useGenerateIdeas } from "@/lib/queries/ai";
import { ImageUploadZone, type ImageItem } from "@/components/image-upload-zone";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const CHAR_LIMIT = 280;

function getCharColor(count: number): string {
  if (count > CHAR_LIMIT) return "text-red-500";
  if (count >= 260) return "text-yellow-500";
  return "text-muted-foreground";
}

export default function NewPostPage() {
  const router = useRouter();
  const createPost = useCreatePost();
  const { data: connections, isLoading: connectionsLoading } = useConnections();

  const generateIdeas = useGenerateIdeas();

  const [body, setBody] = useState("");
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [ideasOpen, setIdeasOpen] = useState(false);

  const uploadedPaths = images.filter((i) => !i.uploading).map((i) => i.path);
  const hasUploading = images.some((i) => i.uploading);

  const activeConnections = connections?.filter((c) => c.status === "active") ?? [];
  const charCount = body.length;
  const isOverLimit = charCount > CHAR_LIMIT;
  const canSubmit =
    body.trim().length > 0 &&
    !isOverLimit &&
    selectedPlatforms.length > 0 &&
    !createPost.isPending &&
    !hasUploading;

  function togglePlatform(platform: string) {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform],
    );
  }

  async function handleSaveDraft() {
    if (!body.trim() || selectedPlatforms.length === 0) return;

    createPost.mutate(
      {
        body,
        platforms: selectedPlatforms as ("twitter" | "linkedin" | "threads")[],
        ...(uploadedPaths.length > 0 ? { media_urls: uploadedPaths } : {}),
      },
      {
        onSuccess: () => {
          toast.success("Draft saved");
          router.push("/dashboard/content");
        },
        onError: () => toast.error("Failed to save draft"),
      },
    );
  }

  async function handlePublishNow() {
    if (!canSubmit) return;

    createPost.mutate(
      {
        body,
        platforms: selectedPlatforms as ("twitter" | "linkedin" | "threads")[],
        ...(uploadedPaths.length > 0 ? { media_urls: uploadedPaths } : {}),
      },
      {
        onSuccess: (post) => {
          // After creating, trigger publish via the publish endpoint
          fetch(`/api/posts/${post.id}/publish`, { method: "POST" })
            .then((res) => {
              if (res.ok) {
                toast.success("Post published!");
              } else {
                toast.error("Post created but publish failed");
              }
              router.push("/dashboard/content");
            })
            .catch(() => {
              toast.error("Post created but publish failed");
              router.push("/dashboard/content");
            });
        },
        onError: () => toast.error("Failed to create post"),
      },
    );
  }

  async function handleSchedule() {
    if (!canSubmit || !scheduledAt) return;

    createPost.mutate(
      {
        body,
        platforms: selectedPlatforms as ("twitter" | "linkedin" | "threads")[],
        scheduled_at: new Date(scheduledAt).toISOString(),
        ...(uploadedPaths.length > 0 ? { media_urls: uploadedPaths } : {}),
      },
      {
        onSuccess: () => {
          toast.success(`Post scheduled for ${new Date(scheduledAt).toLocaleString()}`);
          router.push("/dashboard/content");
        },
        onError: () => toast.error("Failed to schedule post"),
      },
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New Post</h1>
          <p className="text-sm text-muted-foreground">
            Compose and publish to your connected platforms.
          </p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/content">Cancel</Link>
        </Button>
      </div>

      {/* Ideation Panel */}
      <Card className="border-dashed">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIdeasOpen(!ideasOpen)}
              className="flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform ${ideasOpen ? "rotate-90" : ""}`}
              >
                <path d="M6 4l4 4-4 4" />
              </svg>
              Content Ideas
            </button>
            <Button
              variant="outline"
              size="xs"
              onClick={() => {
                generateIdeas.mutate(undefined, {
                  onSuccess: () => {
                    setIdeasOpen(true);
                    toast.success("Ideas generated!");
                  },
                  onError: (err: Error) => toast.error(err.message),
                });
              }}
              disabled={generateIdeas.isPending}
            >
              {generateIdeas.isPending ? "Generating..." : "Get Ideas"}
            </Button>
          </div>

          {(ideasOpen || generateIdeas.isSuccess) && generateIdeas.data && (
            <div className="mt-3 space-y-2">
              {(generateIdeas.data as { headline: string; format: string; intent: string; topic: string; rationale: string; suggested_hook: string; confidence: string }[]).map((idea, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1">
                      <p className="text-sm font-medium leading-snug">
                        {idea.headline}
                      </p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-medium">
                          {idea.format}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-medium">
                          {idea.intent}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-medium">
                          {idea.topic}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => {
                        setBody(idea.suggested_hook);
                        setIdeasOpen(false);
                      }}
                    >
                      Use This Idea
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {idea.rationale}
                  </p>
                  <p className="text-xs italic text-foreground/60">
                    {idea.suggested_hook}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Editor */}
      <Card>
        <CardContent className="pt-5 space-y-5">
          {/* Text Area */}
          <div className="space-y-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What's on your mind?"
              rows={5}
              className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <div className="flex justify-end">
              <span className={`text-xs font-medium ${getCharColor(charCount)}`}>
                {charCount} / {CHAR_LIMIT}
              </span>
            </div>
          </div>

          {/* Image Upload */}
          <ImageUploadZone
            images={images}
            onChange={setImages}
            disabled={createPost.isPending}
          />

          {/* Platform Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Platforms</label>
            {!connectionsLoading && activeConnections.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-3">
                <p className="text-sm text-muted-foreground">
                  No platforms connected.{" "}
                  <Link
                    href="/dashboard/connections"
                    className="font-medium text-foreground underline underline-offset-4"
                  >
                    Connect a platform
                  </Link>{" "}
                  to start publishing.
                </p>
              </div>
            ) : (
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
                      aria-label={conn.platform.charAt(0).toUpperCase() + conn.platform.slice(1)}
                    />
                    <span className="capitalize">{conn.platform}</span>
                    <span className="text-xs text-muted-foreground">
                      @{conn.platform_username}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Schedule Toggle */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={scheduleEnabled}
                onChange={(e) => setScheduleEnabled(e.target.checked)}
                className="rounded border-input"
                aria-label="Schedule for later"
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

          {/* Action Buttons */}
          <div className="flex items-center gap-2 border-t border-border pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={!body.trim() || selectedPlatforms.length === 0 || createPost.isPending}
            >
              Save Draft
            </Button>

            {scheduleEnabled ? (
              <Button
                size="sm"
                onClick={handleSchedule}
                disabled={!canSubmit || !scheduledAt}
              >
                Schedule
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handlePublishNow}
                disabled={!canSubmit}
              >
                Publish Now
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
