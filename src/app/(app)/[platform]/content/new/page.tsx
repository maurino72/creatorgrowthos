"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { usePlatform } from "@/lib/hooks/use-platform";
import { appUrl } from "@/lib/urls";
import { useCreatePost, postKeys } from "@/lib/queries/posts";
import { useQueryClient } from "@tanstack/react-query";
import { useGenerateIdeas, useSuggestHashtags, useSuggestMentions } from "@/lib/queries/ai";
import { computeMentionsCharLength } from "@/lib/validators/mentions";
import { computeTagsCharLength } from "@/lib/validators/tags";
import { getCharLimitForPlatforms } from "@/lib/adapters/platform-config";
import { PLATFORM_CAPABILITIES } from "@/lib/adapters/capabilities";
import { countTweetLength, T_CO_LENGTH } from "@/lib/utils/twitter-char-count";
import {
  ImageUploadZone,
  type ImageItem,
} from "@/components/image-upload-zone";
import { MentionInput } from "@/components/mention-input";
import { TagInput } from "@/components/tag-input";
import { PollBuilder } from "@/components/poll-builder";
import { ReplySettingsSelect } from "@/components/reply-settings-select";
import { QuoteTweetInput } from "@/components/quote-tweet-input";
import { AltTextDialog } from "@/components/alt-text-dialog";
import { Button } from "@/components/ui/button";
import type { ReplySettings } from "@/lib/validators/reply-settings";

function getCharColor(count: number, limit: number): string {
  if (count > limit) return "text-red-500";
  if (count >= limit * 0.93) return "text-yellow-500";
  return "text-muted-foreground/50";
}

function getBarColor(count: number, limit: number): string {
  if (count > limit) return "#ef4444";
  if (count >= limit * 0.93) return "#eab308";
  return "var(--foreground)";
}

function NewPostPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const createPost = useCreatePost();
  const { platform, slug } = usePlatform();
  const generateIdeas = useGenerateIdeas();

  const suggestHashtags = useSuggestHashtags();
  const suggestMentions = useSuggestMentions();

  const [body, setBody] = useState(searchParams.get("body") ?? "");
  const [mentions, setMentions] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [ideasOpen, setIdeasOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);

  // New feature state
  const [pollEnabled, setPollEnabled] = useState(false);
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollDuration, setPollDuration] = useState(1440);
  const [replySettings, setReplySettings] = useState<ReplySettings>("everyone");
  const [quoteTweetId, setQuoteTweetId] = useState("");
  const [altTexts, setAltTexts] = useState<Record<string, string>>({});
  const [altTextImageUrl, setAltTextImageUrl] = useState("");
  const [altTextMediaPath, setAltTextMediaPath] = useState("");

  const uploadedPaths = images.filter((i) => !i.uploading).map((i) => i.path);
  const hasUploading = images.some((i) => i.uploading);
  const platforms = platform
    ? [platform as "twitter" | "linkedin" | "threads"]
    : [];
  const charLimit = getCharLimitForPlatforms(platforms);
  const bodyCharCount = platform === "twitter" ? countTweetLength(body) : body.length;
  const charCount = bodyCharCount + computeMentionsCharLength(mentions) + computeTagsCharLength(tags);

  // Platform capabilities
  const caps = platform ? PLATFORM_CAPABILITIES[platform as keyof typeof PLATFORM_CAPABILITIES] : null;
  const showPollOption = caps?.poll ?? false;
  const showReplySettings = caps?.replySettings ?? false;
  const showQuoteTweet = caps?.quoteTweet ?? false;
  const isOverLimit = charCount > charLimit;
  // Polls are mutually exclusive with media
  const hasPollConflict = pollEnabled && images.length > 0;
  const canSubmit =
    body.trim().length > 0 &&
    !isOverLimit &&
    platforms.length > 0 &&
    !createPost.isPending &&
    !hasUploading &&
    !hasPollConflict;

  const showMedia = mediaOpen || images.length > 0;
  const showIdeas =
    (ideasOpen || generateIdeas.isSuccess) && generateIdeas.data;

  function buildMutationPayload() {
    const payload: Record<string, unknown> = {
      body,
      platforms,
    };
    if (uploadedPaths.length > 0) payload.media_urls = uploadedPaths;
    if (mentions.length > 0) payload.mentions = mentions;
    if (tags.length > 0) payload.tags = tags;
    if (pollEnabled && pollOptions.some((o) => o.trim())) {
      payload.poll = {
        options: pollOptions.filter((o) => o.trim()),
        duration_minutes: pollDuration,
      };
    }
    if (quoteTweetId) payload.quote_tweet_id = quoteTweetId;
    if (replySettings !== "everyone") payload.reply_settings = replySettings;
    return payload;
  }

  async function handleSaveDraft() {
    if (!body.trim() || platforms.length === 0) return;

    createPost.mutate(
      buildMutationPayload() as Parameters<typeof createPost.mutate>[0],
      {
        onSuccess: () => {
          toast.success("Draft saved");
          router.push(slug ? appUrl.content(slug) : "/");
        },
        onError: () => toast.error("Failed to save draft"),
      },
    );
  }

  async function handlePublishNow() {
    if (!canSubmit) return;

    createPost.mutate(
      buildMutationPayload() as Parameters<typeof createPost.mutate>[0],
      {
        onSuccess: (post) => {
          fetch(`/api/posts/${post.id}/publish`, { method: "POST" })
            .then(async (res) => {
              if (res.ok) {
                toast.success("Post published!");
              } else {
                toast.error("Post created but publish failed");
              }
              await queryClient.invalidateQueries({ queryKey: postKeys.all });
              router.push(slug ? appUrl.content(slug) : "/");
            })
            .catch(async () => {
              toast.error("Post created but publish failed");
              await queryClient.invalidateQueries({ queryKey: postKeys.all });
              router.push(slug ? appUrl.content(slug) : "/");
            });
        },
        onError: () => toast.error("Failed to create post"),
      },
    );
  }

  async function handleSchedule() {
    if (!canSubmit || !scheduledAt) return;

    const payload = buildMutationPayload();
    payload.scheduled_at = new Date(scheduledAt).toISOString();

    createPost.mutate(
      payload as Parameters<typeof createPost.mutate>[0],
      {
        onSuccess: () => {
          toast.success(
            `Post scheduled for ${new Date(scheduledAt).toLocaleString()}`,
          );
          router.push(slug ? appUrl.content(slug) : "/");
        },
        onError: () => toast.error("Failed to schedule post"),
      },
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      {/* ── Masthead ── */}
      <div className="flex items-end justify-between mb-4">
        <h1 className="text-3xl font-normal tracking-tight font-serif">
          New Post
        </h1>
        <Link
          href={slug ? appUrl.content(slug) : "/"}
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
              width: `${Math.min((charCount / charLimit) * 100, 100)}%`,
              backgroundColor: getBarColor(charCount, charLimit),
              opacity: charCount > 0 ? 0.5 : 0,
            }}
          />
        </div>
        <span
          className={`text-[11px] font-mono tabular-nums shrink-0 ${getCharColor(charCount, charLimit)}`}
        >
          {charCount} / {charLimit}
        </span>
      </div>

      {/* ── Mentions ── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/50">
            Mentions
          </p>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              if (body.trim()) {
                suggestMentions.mutate(body, {
                  onError: (err: Error) => toast.error(err.message),
                });
              }
            }}
            loading={suggestMentions.isPending}
            disabled={!body.trim()}
          >
            Suggest Mentions
          </Button>
        </div>
        <MentionInput
          mentions={mentions}
          onChange={setMentions}
          bodyLength={body.length}
          tagsCharLength={computeTagsCharLength(tags)}
          charLimit={charLimit}
          suggestions={suggestMentions.data ?? undefined}
          suggestLoading={suggestMentions.isPending}
        />
      </div>

      {/* ── Tags ── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/50">
            Hashtags
          </p>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              if (body.trim()) {
                suggestHashtags.mutate(body, {
                  onError: (err: Error) => toast.error(err.message),
                });
              }
            }}
            loading={suggestHashtags.isPending}
            disabled={!body.trim()}
          >
            Suggest Hashtags
          </Button>
        </div>
        <TagInput
          tags={tags}
          onChange={setTags}
          bodyLength={body.length + computeMentionsCharLength(mentions)}
          charLimit={charLimit}
          suggestions={suggestHashtags.data ?? undefined}
          suggestLoading={suggestHashtags.isPending}
        />
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-8 mb-8 flex-wrap">
        <button
          type="button"
          onClick={() => {
            setMediaOpen(!mediaOpen);
            if (!mediaOpen && pollEnabled) {
              setPollEnabled(false);
              toast("Media and polls can't be used together");
            }
          }}
          disabled={pollEnabled}
          className={`flex items-center gap-2 transition-colors ${
            showMedia
              ? "text-foreground"
              : pollEnabled
                ? "text-muted-foreground/20 cursor-not-allowed"
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

        {showPollOption && (
          <button
            type="button"
            onClick={() => {
              if (!pollEnabled && images.length > 0) {
                toast("Polls can't be used with media");
                return;
              }
              setPollEnabled(!pollEnabled);
              if (!pollEnabled) {
                setMediaOpen(false);
              }
            }}
            disabled={images.length > 0}
            className={`flex items-center gap-2 transition-colors ${
              pollEnabled
                ? "text-foreground"
                : images.length > 0
                  ? "text-muted-foreground/20 cursor-not-allowed"
                  : "text-muted-foreground/50 hover:text-foreground"
            }`}
            aria-label="Toggle poll"
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
              <rect x="2" y="3" width="8" height="2.5" rx="1" />
              <rect x="2" y="7.75" width="14" height="2.5" rx="1" />
              <rect x="2" y="12.5" width="5" height="2.5" rx="1" />
            </svg>
            <span className="text-[10px] uppercase tracking-[0.2em]">Poll</span>
          </button>
        )}

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

        <div className="ml-auto flex items-center gap-3">
          {caps?.thread && slug && (
            <Link
              href={appUrl.contentNewThread(slug)}
              className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 hover:text-foreground transition-colors"
            >
              Create Thread
            </Link>
          )}
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
            loading={generateIdeas.isPending}
          >
            Get Ideas
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

      {/* ── Expandable: Poll ── */}
      {pollEnabled && (
        <div className="mb-8">
          <PollBuilder
            options={pollOptions}
            durationMinutes={pollDuration}
            onOptionsChange={setPollOptions}
            onDurationChange={setPollDuration}
            onRemove={() => setPollEnabled(false)}
            disabled={createPost.isPending}
          />
          <div className="h-px bg-foreground/8 mt-6" />
        </div>
      )}

      {/* ── Reply Settings + Quote Tweet ── */}
      {(showReplySettings || showQuoteTweet) && (
        <div className="mb-8 space-y-4">
          {showReplySettings && (
            <ReplySettingsSelect
              value={replySettings}
              onChange={setReplySettings}
              disabled={createPost.isPending}
            />
          )}
          {showQuoteTweet && (
            <QuoteTweetInput
              value={quoteTweetId}
              onChange={setQuoteTweetId}
              disabled={createPost.isPending}
            />
          )}
          <div className="h-px bg-foreground/8" />
        </div>
      )}

      {/* ── Alt Text Dialog ── */}
      <AltTextDialog
        open={!!altTextImageUrl}
        imageUrl={altTextImageUrl}
        altText={altTexts[altTextMediaPath] ?? ""}
        onAltTextChange={(text) =>
          setAltTexts((prev) => ({ ...prev, [altTextMediaPath]: text }))
        }
        onClose={() => {
          setAltTextImageUrl("");
          setAltTextMediaPath("");
        }}
      />

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
            platforms.length === 0 ||
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
          className={`ml-auto text-[11px] font-mono tabular-nums ${getCharColor(charCount, charLimit)}`}
        >
          {charCount}
        </span>
      </div>
    </div>
  );
}

export default function NewPostPage() {
  return (
    <Suspense>
      <NewPostPageInner />
    </Suspense>
  );
}
