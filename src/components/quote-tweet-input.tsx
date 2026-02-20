"use client";

interface QuoteTweetInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * Extract tweet ID from a Twitter/X status URL.
 * Supports formats: https://twitter.com/user/status/123, https://x.com/user/status/123
 */
function extractTweetId(input: string): string {
  const match = input.match(
    /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/,
  );
  return match ? match[1] : input;
}

export function QuoteTweetInput({
  value,
  onChange,
  disabled,
}: QuoteTweetInputProps) {
  function handleBlur() {
    if (value) {
      onChange(extractTweetId(value));
    }
  }

  return (
    <div className="flex items-center gap-3">
      <label
        htmlFor="quote-tweet"
        className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 shrink-0"
      >
        Quote Tweet
      </label>
      <div className="relative flex-1">
        <input
          id="quote-tweet"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
          placeholder="Paste tweet URL or ID"
          disabled={disabled}
          className="w-full rounded border border-input bg-transparent px-3 py-1.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-ring/50 disabled:cursor-not-allowed disabled:opacity-50 pr-8"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Clear quote tweet"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground transition-colors"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
