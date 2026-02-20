"use client";

interface ThreadPost {
  body: string;
  media_urls: string[];
}

interface ThreadComposerProps {
  posts: ThreadPost[];
  charLimit: number;
  onPostsChange: (posts: ThreadPost[]) => void;
  disabled?: boolean;
}

function getCharColor(count: number, limit: number): string {
  if (count > limit) return "text-red-500";
  if (count >= limit * 0.93) return "text-yellow-500";
  return "text-muted-foreground/40";
}

export function ThreadComposer({
  posts,
  charLimit,
  onPostsChange,
  disabled,
}: ThreadComposerProps) {
  function updatePost(index: number, body: string) {
    const updated = posts.map((p, i) => (i === index ? { ...p, body } : p));
    onPostsChange(updated);
  }

  function addPost() {
    onPostsChange([...posts, { body: "", media_urls: [] }]);
  }

  function removePost(index: number) {
    if (posts.length <= 2) return;
    onPostsChange(posts.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-0">
      {posts.map((post, index) => (
        <div key={index} className="relative flex gap-3 pb-6">
          {/* Thread connector */}
          <div className="flex flex-col items-center">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-foreground/15 text-xs font-mono tabular-nums text-muted-foreground/60">
              {index + 1}
            </div>
            {index < posts.length - 1 && (
              <div className="mt-1 w-px flex-1 bg-foreground/10" />
            )}
          </div>

          {/* Post editor */}
          <div className="flex-1 min-w-0">
            <textarea
              value={post.body}
              onChange={(e) => updatePost(index, e.target.value)}
              placeholder={`Tweet ${index + 1}`}
              rows={3}
              disabled={disabled}
              className="w-full resize-none bg-transparent border-0 text-[15px] leading-[1.75] placeholder:text-muted-foreground/25 focus:outline-none px-0 font-serif disabled:opacity-50"
            />

            <div className="flex items-center justify-between mt-1">
              <span
                className={`text-[10px] font-mono tabular-nums ${getCharColor(post.body.length, charLimit)}`}
              >
                {post.body.length}/{charLimit}
              </span>

              {posts.length > 2 && (
                <button
                  type="button"
                  onClick={() => removePost(index)}
                  disabled={disabled}
                  aria-label={`Remove tweet ${index + 1}`}
                  className="text-[10px] text-muted-foreground/30 hover:text-destructive transition-colors disabled:opacity-50"
                >
                  Remove
                </button>
              )}
            </div>

            {/* Divider between posts */}
            {index < posts.length - 1 && (
              <div className="h-px bg-foreground/6 mt-3" />
            )}
          </div>
        </div>
      ))}

      {/* Add tweet button */}
      <button
        type="button"
        onClick={addPost}
        disabled={disabled}
        className="ml-10 text-xs text-muted-foreground/50 hover:text-foreground transition-colors disabled:opacity-50"
      >
        + Add Tweet
      </button>
    </div>
  );
}
