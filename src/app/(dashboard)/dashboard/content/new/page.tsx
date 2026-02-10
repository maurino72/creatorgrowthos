"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useCreatePost } from "@/lib/queries/posts";
import { useConnections } from "@/lib/queries/connections";
import { useGenerateIdeas } from "@/lib/queries/ai";
import {
  ImageUploadZone,
  type ImageItem,
} from "@/components/image-upload-zone";
import { Button } from "@/components/ui/button";

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
  const [mediaOpen, setMediaOpen] = useState(false);

  const uploadedPaths = images.filter((i) => !i.uploading).map((i) => i.path);
  const hasUploading = images.some((i) => i.uploading);
  const activeConnections =
    connections?.filter((c) => c.status === "active") ?? [];
  const charCount = body.length;
  const isOverLimit = charCount > CHAR_LIMIT;
  const canSubmit =
    body.trim().length > 0 &&
    !isOverLimit &&
    selectedPlatforms.length > 0 &&
    !createPost.isPending &&
    !hasUploading;

  const showMedia = mediaOpen || images.length > 0;
  const showIdeas =
    (ideasOpen || generateIdeas.isSuccess) && generateIdeas.data;

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
          toast.success(
            `Post scheduled for ${new Date(scheduledAt).toLocaleString()}`,
          );
          router.push("/dashboard/content");
        },
        onError: () => toast.error("Failed to schedule post"),
      },
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* ── Masthead ── */}
      <div className="flex items-end justify-between mb-4">
        <h1 className="text-3xl font-normal tracking-tight font-serif">
          New Post
        </h1>
        <Link
          href="/dashboard/content"
          className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60 hover:text-foreground transition-colors pb-1"
        >
          Cancel
        </Link>
      </div>

      {/* Editorial rule */}
      <div className="h-px bg-foreground/25 mb-10" />

      {/* ── Writing Surface ── */}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What's on your mind?"
        rows={8}
        className="w-full resize-none bg-transparent border-0 text-[19px] leading-[1.85] placeholder:text-muted-foreground/25 focus:outline-none px-0 min-h-[240px] font-serif"
      />

      {/* ── Character Gauge ── */}
      <div className="flex items-center gap-4 mt-3 mb-10">
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

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-8 mb-8">
        <button
          type="button"
          onClick={() => setMediaOpen(!mediaOpen)}
          className={`flex items-center gap-2 transition-colors ${
            showMedia
              ? "text-foreground"
              : "text-muted-foreground/50 hover:text-foreground"
          }`}
          aria-label="Toggle images"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 18 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="2" width="14" height="14" rx="2" />
            <circle cx="6.5" cy="6.5" r="1.5" />
            <path d="M16 12l-3.5-3.5L5 16" />
          </svg>
          <span className="text-[10px] uppercase tracking-[0.2em]">Media</span>
        </button>

        <button
          type="button"
          onClick={() => setIdeasOpen(!ideasOpen)}
          className={`flex items-center gap-2 transition-colors ${
            ideasOpen
              ? "text-foreground"
              : "text-muted-foreground/50 hover:text-foreground"
          }`}
          aria-label="Toggle ideas"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 18 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M7 15h4M9 2a5 5 0 0 1 3 9v1.5a.5.5 0 0 1-.5.5h-5a.5.5 0 0 1-.5-.5V11A5 5 0 0 1 9 2z" />
          </svg>
          <span className="text-[10px] uppercase tracking-[0.2em]">Ideas</span>
        </button>

        <div className="ml-auto">
          <Button
            variant="coral"
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
      </div>

      {/* ── Expandable: Images ── */}
      {showMedia && (
        <div className="mb-8">
          <ImageUploadZone
            images={images}
            onChange={setImages}
            disabled={createPost.isPending}
          />
          <div className="h-px bg-foreground/8 mt-6" />
        </div>
      )}

      {/* ── Expandable: Ideas ── */}
      {showIdeas && (
        <div className="mb-8 space-y-4">
          {(
            generateIdeas.data as {
              headline: string;
              format: string;
              intent: string;
              topic: string;
              rationale: string;
              suggested_hook: string;
              confidence: string;
            }[]
          ).map((idea, idx) => (
            <div key={idx} className="group">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <p className="text-[15px] font-normal leading-snug font-serif">
                    {idea.headline}
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/50">
                    {idea.format} &middot; {idea.intent} &middot; {idea.topic}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="xs"
                  className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  onClick={() => {
                    setBody(idea.suggested_hook);
                    setIdeasOpen(false);
                  }}
                >
                  Use This Idea
                </Button>
              </div>
              <p className="text-xs text-muted-foreground/60 leading-relaxed mt-2">
                {idea.rationale}
              </p>
              <p className="text-[13px] italic text-foreground/40 mt-1.5 font-serif">
                {idea.suggested_hook}
              </p>
              {idx <
                ((
                  generateIdeas.data as {
                    headline: string;
                  }[]
                ).length ?? 0) -
                  1 && <div className="h-px bg-foreground/6 mt-4" />}
            </div>
          ))}
          <div className="h-px bg-foreground/8" />
        </div>
      )}

      {/* ── Platforms ── */}
      <div className="mb-8">
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/50 mb-3">
          Platforms
        </p>
        {!connectionsLoading && activeConnections.length === 0 ? (
          <p className="text-sm text-muted-foreground/60">
            No platforms connected.{" "}
            <Link
              href="/dashboard/connections"
              className="text-foreground underline underline-offset-4 decoration-foreground/30 hover:decoration-foreground transition-colors"
            >
              Connect a platform
            </Link>{" "}
            to start publishing.
          </p>
        ) : (
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
                  aria-label={
                    conn.platform.charAt(0).toUpperCase() +
                    conn.platform.slice(1)
                  }
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
                <span className="text-[11px] text-muted-foreground/30">
                  @{conn.platform_username}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* ── Schedule ── */}
      <div className="mb-10">
        <label className="flex items-center gap-2.5 text-sm cursor-pointer group">
          <input
            type="checkbox"
            checked={scheduleEnabled}
            onChange={(e) => setScheduleEnabled(e.target.checked)}
            className="rounded border-input"
            aria-label="Schedule for later"
          />
          <span className="text-muted-foreground/60 group-hover:text-foreground transition-colors">
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

      {/* ── Folio Actions ── */}
      <div className="h-px bg-foreground/20" />
      <div className="flex items-center gap-4 pt-6 pb-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSaveDraft}
          disabled={
            !body.trim() ||
            selectedPlatforms.length === 0 ||
            createPost.isPending
          }
        >
          Save Draft
        </Button>

        {scheduleEnabled ? (
          <Button
            variant="coral"
            size="sm"
            onClick={handleSchedule}
            disabled={!canSubmit || !scheduledAt}
          >
            Schedule
          </Button>
        ) : (
          <Button
            variant="coral"
            size="sm"
            onClick={handlePublishNow}
            disabled={!canSubmit}
          >
            Publish Now
          </Button>
        )}

        <span
          className={`ml-auto text-[11px] font-mono tabular-nums ${getCharColor(charCount)}`}
        >
          {charCount}
        </span>
      </div>
    </div>
  );
}
