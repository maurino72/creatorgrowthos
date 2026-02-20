"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { usePlatform } from "@/lib/hooks/use-platform";
import { appUrl } from "@/lib/urls";
import { useCreateThread, usePublishThread } from "@/lib/queries/threads";
import { getCharLimitForPlatform } from "@/lib/adapters/platform-config";
import type { PlatformType } from "@/lib/adapters/types";
import { ThreadComposer } from "@/components/thread-composer";
import { Button } from "@/components/ui/button";
import { splitTextIntoThread } from "@/lib/validators/threads";

function ThreadPageInner() {
  const router = useRouter();
  const { platform, slug } = usePlatform();
  const createThread = useCreateThread();
  const publishThread = usePublishThread();

  const [title, setTitle] = useState("");
  const [posts, setPosts] = useState([
    { body: "", media_urls: [] as string[] },
    { body: "", media_urls: [] as string[] },
  ]);

  const charLimit = platform
    ? getCharLimitForPlatform(platform as PlatformType)
    : 280;

  const hasContent = posts.some((p) => p.body.trim().length > 0);
  const hasOverLimit = posts.some((p) => p.body.length > charLimit);
  const canSubmit = hasContent && !hasOverLimit && !createThread.isPending;

  function handleAutoSplit() {
    const fullText = posts.map((p) => p.body).join("\n\n");
    if (!fullText.trim()) return;

    const splitParts = splitTextIntoThread(fullText, charLimit);
    if (splitParts.length < 2) {
      toast("Text fits in a single tweet — no split needed");
      return;
    }

    setPosts(splitParts.map((body) => ({ body, media_urls: [] })));
    toast.success(`Split into ${splitParts.length} tweets`);
  }

  async function handleSaveDraft() {
    if (!hasContent) return;

    createThread.mutate(
      {
        title: title || undefined,
        posts: posts.filter((p) => p.body.trim()),
      },
      {
        onSuccess: () => {
          toast.success("Thread draft saved");
          router.push(slug ? appUrl.content(slug) : "/");
        },
        onError: () => toast.error("Failed to save thread"),
      },
    );
  }

  async function handlePublishNow() {
    if (!canSubmit) return;

    createThread.mutate(
      {
        title: title || undefined,
        posts: posts.filter((p) => p.body.trim()),
      },
      {
        onSuccess: (data) => {
          publishThread.mutate(data.thread.id, {
            onSuccess: () => {
              toast.success("Thread published!");
              router.push(slug ? appUrl.content(slug) : "/");
            },
            onError: () => {
              toast.error("Thread created but publish failed");
              router.push(slug ? appUrl.content(slug) : "/");
            },
          });
        },
        onError: () => toast.error("Failed to create thread"),
      },
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      {/* ── Masthead ── */}
      <div className="flex items-end justify-between mb-4">
        <h1 className="text-3xl font-normal tracking-tight font-serif">
          New Thread
        </h1>
        <Link
          href={slug ? appUrl.contentNew(slug) : "/"}
          className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60 hover:text-foreground transition-colors pb-1"
        >
          Back
        </Link>
      </div>

      {/* Editorial rule */}
      <div className="h-px bg-foreground/25 mb-10" />

      {/* ── Thread Title ── */}
      <div className="mb-8">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Thread title (optional)"
          className="w-full bg-transparent border-0 text-lg placeholder:text-muted-foreground/25 focus:outline-none px-0 font-serif"
        />
      </div>

      {/* ── Thread Composer ── */}
      <div className="mb-8">
        <ThreadComposer
          posts={posts}
          charLimit={charLimit}
          onPostsChange={setPosts}
          disabled={createThread.isPending || publishThread.isPending}
        />
      </div>

      {/* ── Auto-split button ── */}
      <div className="mb-8">
        <Button
          variant="ghost"
          size="xs"
          onClick={handleAutoSplit}
          disabled={!hasContent}
        >
          Auto-split text
        </Button>
      </div>

      {/* ── Folio Actions ── */}
      <div className="h-px bg-foreground/20" />
      <div className="flex items-center gap-4 pt-6 pb-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSaveDraft}
          disabled={!hasContent || createThread.isPending}
          loading={createThread.isPending}
        >
          Save Draft
        </Button>

        <Button
          variant="coral"
          size="sm"
          onClick={handlePublishNow}
          disabled={!canSubmit}
          loading={publishThread.isPending}
        >
          Publish Thread
        </Button>

        <span className="ml-auto text-[10px] text-muted-foreground/40 font-mono tabular-nums">
          {posts.filter((p) => p.body.trim()).length} tweets
        </span>
      </div>
    </div>
  );
}

export default function ThreadPage() {
  return (
    <Suspense>
      <ThreadPageInner />
    </Suspense>
  );
}
