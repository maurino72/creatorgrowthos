"use client";

import { useState } from "react";
import { normalizeTag, computeTagsCharLength, MAX_TAGS_PER_POST } from "@/lib/validators/tags";
import type { HashtagSuggestion } from "@/lib/ai/hashtags";

export interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
  disabled?: boolean;
  bodyLength: number;
  suggestions?: HashtagSuggestion[];
  suggestLoading?: boolean;
}

const CHAR_LIMIT = 280;

export function TagInput({
  tags,
  onChange,
  maxTags = MAX_TAGS_PER_POST,
  disabled = false,
  bodyLength,
  suggestions,
  suggestLoading,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");

  const tagsCharLen = computeTagsCharLength(tags);
  const remaining = CHAR_LIMIT - bodyLength - tagsCharLen;

  function addTag(raw: string) {
    const normalized = normalizeTag(raw);
    if (!normalized) return;
    if (tags.includes(normalized)) return;
    if (tags.length >= maxTags) return;

    onChange([...tags, normalized]);
    setInputValue("");
  }

  function removeTag(index: number) {
    onChange(tags.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (val.endsWith(",")) {
      const tagPart = val.slice(0, -1).trim();
      if (tagPart) {
        addTag(tagPart);
      }
    } else {
      setInputValue(val);
    }
  }

  function handleSuggestionClick(tag: string) {
    if (tags.includes(tag)) return;
    if (tags.length >= maxTags) return;
    onChange([...tags, tag]);
  }

  return (
    <div data-slot="tag-input">
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        {tags.map((tag, i) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
          >
            #{tag}
            {!disabled && (
              <button
                type="button"
                aria-label={`Remove ${tag}`}
                onClick={() => removeTag(i)}
                className="ml-0.5 text-primary/50 hover:text-primary transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Add tag..."
          className="flex-1 rounded border border-input bg-transparent px-3 py-1.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <span
          data-testid="char-budget"
          className={`text-xs tabular-nums ${remaining < 0 ? "text-destructive" : "text-muted-foreground"}`}
        >
          {remaining}
        </span>
      </div>

      {suggestLoading && (
        <div data-testid="suggest-loading" className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Suggesting hashtags...
        </div>
      )}

      {suggestions && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {suggestions.map((s) => {
            const alreadyAdded = tags.includes(s.tag);
            return (
              <button
                key={s.tag}
                type="button"
                disabled={alreadyAdded || disabled}
                onClick={() => handleSuggestionClick(s.tag)}
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                  alreadyAdded
                    ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                    : "bg-coral/10 text-coral hover:bg-coral/20 cursor-pointer"
                }`}
              >
                #{s.tag}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
