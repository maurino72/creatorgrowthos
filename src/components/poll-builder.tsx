"use client";

import { MAX_POLL_OPTION_LENGTH } from "@/lib/validators/polls";
import { Button } from "./ui/button";

interface PollBuilderProps {
  options: string[];
  durationMinutes: number;
  onOptionsChange: (options: string[]) => void;
  onDurationChange: (minutes: number) => void;
  onRemove: () => void;
  disabled?: boolean;
}

const DURATION_OPTIONS = [
  { label: "5 minutes", value: 5 },
  { label: "30 minutes", value: 30 },
  { label: "1 hour", value: 60 },
  { label: "6 hours", value: 360 },
  { label: "1 day", value: 1440 },
  { label: "3 days", value: 4320 },
  { label: "7 days", value: 10080 },
];

export function PollBuilder({
  options,
  durationMinutes,
  onOptionsChange,
  onDurationChange,
  onRemove,
  disabled,
}: PollBuilderProps) {
  function handleOptionChange(index: number, value: string) {
    const updated = [...options];
    updated[index] = value;
    onOptionsChange(updated);
  }

  function addOption() {
    if (options.length < 4) {
      onOptionsChange([...options, ""]);
    }
  }

  function removeOption(index: number) {
    if (options.length > 2) {
      onOptionsChange(options.filter((_, i) => i !== index));
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/50">
          Poll
        </p>
        <Button
          variant="ghost"
          size="xs"
          onClick={onRemove}
          disabled={disabled}
          className="text-destructive hover:text-destructive"
        >
          Remove Poll
        </Button>
      </div>

      <div className="space-y-2">
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={option}
                onChange={(e) =>
                  handleOptionChange(index, e.target.value.slice(0, MAX_POLL_OPTION_LENGTH))
                }
                placeholder={`Option ${index + 1}`}
                disabled={disabled}
                maxLength={MAX_POLL_OPTION_LENGTH}
                className="w-full rounded border border-input bg-transparent px-3 py-1.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-ring/50 disabled:cursor-not-allowed disabled:opacity-50 pr-12"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono tabular-nums text-muted-foreground/40">
                {option.length}/{MAX_POLL_OPTION_LENGTH}
              </span>
            </div>
            {options.length > 2 && (
              <button
                type="button"
                onClick={() => removeOption(index)}
                disabled={disabled}
                aria-label={`Remove option ${index + 1}`}
                className="shrink-0 p-1 text-muted-foreground/40 hover:text-foreground transition-colors disabled:opacity-50"
              >
                <svg
                  width="14"
                  height="14"
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
        ))}
      </div>

      {options.length < 4 && (
        <button
          type="button"
          onClick={addOption}
          disabled={disabled}
          className="text-xs text-muted-foreground/50 hover:text-foreground transition-colors disabled:opacity-50"
        >
          + Add Option
        </button>
      )}

      <div className="flex items-center gap-3">
        <label
          htmlFor="poll-duration"
          className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50"
        >
          Duration
        </label>
        <select
          id="poll-duration"
          aria-label="Poll duration"
          value={durationMinutes}
          onChange={(e) => onDurationChange(Number(e.target.value))}
          disabled={disabled}
          className="rounded border border-input bg-transparent px-2 py-1 text-sm focus:outline-none focus:border-ring/50 disabled:opacity-50"
        >
          {DURATION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
