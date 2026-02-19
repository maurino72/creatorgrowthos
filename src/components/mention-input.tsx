"use client";

import { useState } from "react";
import { normalizeMention, mentionSchema, computeMentionsCharLength, MAX_MENTIONS_PER_POST } from "@/lib/validators/mentions";
import type { MentionSuggestion } from "@/lib/ai/mentions";

export interface MentionInputProps {
  mentions: string[];
  onChange: (mentions: string[]) => void;
  maxMentions?: number;
  disabled?: boolean;
  bodyLength: number;
  tagsCharLength: number;
  charLimit?: number;
  suggestions?: MentionSuggestion[];
  suggestLoading?: boolean;
}

export function MentionInput({
  mentions,
  onChange,
  maxMentions = MAX_MENTIONS_PER_POST,
  disabled = false,
  bodyLength,
  tagsCharLength,
  charLimit = 280,
  suggestions,
  suggestLoading,
}: MentionInputProps) {
  const [inputValue, setInputValue] = useState("");

  const mentionsCharLen = computeMentionsCharLength(mentions);
  const remaining = charLimit - bodyLength - tagsCharLength - mentionsCharLen;

  function addMention(raw: string) {
    const normalized = normalizeMention(raw);
    if (!normalized) return;
    if (!mentionSchema.safeParse(normalized).success) return;
    if (mentions.includes(normalized)) return;
    if (mentions.length >= maxMentions) return;

    onChange([...mentions, normalized]);
    setInputValue("");
  }

  function removeMention(index: number) {
    onChange(mentions.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (inputValue.trim()) {
        addMention(inputValue);
      }
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (val.endsWith(",")) {
      const mentionPart = val.slice(0, -1).trim();
      if (mentionPart) {
        addMention(mentionPart);
      }
    } else {
      setInputValue(val);
    }
  }

  function handleSuggestionClick(handle: string) {
    if (mentions.includes(handle)) return;
    if (mentions.length >= maxMentions) return;
    onChange([...mentions, handle]);
  }

  return (
    <div data-slot="mention-input">
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        {mentions.map((mention, i) => (
          <span
            key={mention}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
          >
            @{mention}
            {!disabled && (
              <button
                type="button"
                aria-label={`Remove ${mention}`}
                onClick={() => removeMention(i)}
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
          placeholder="Add @mention..."
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
          Suggesting mentions...
        </div>
      )}

      {suggestions && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {suggestions.map((s) => {
            const alreadyAdded = mentions.includes(s.handle);
            return (
              <button
                key={s.handle}
                type="button"
                disabled={alreadyAdded || disabled}
                onClick={() => handleSuggestionClick(s.handle)}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                  alreadyAdded
                    ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                    : "bg-coral/10 text-coral hover:bg-coral/20 cursor-pointer"
                }`}
              >
                <span>@{s.handle}</span>
                <span className="text-[10px] text-muted-foreground/60">{s.reason}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
