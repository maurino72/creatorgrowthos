"use client";

import { REPLY_SETTINGS, type ReplySettings } from "@/lib/validators/reply-settings";

interface ReplySettingsSelectProps {
  value: ReplySettings;
  onChange: (value: ReplySettings) => void;
  disabled?: boolean;
}

const LABELS: Record<ReplySettings, string> = {
  everyone: "Everyone",
  mentioned_users: "Mentioned users only",
  following: "People you follow",
  subscribers: "Subscribers only",
  verified_users: "Verified users only",
};

export function ReplySettingsSelect({
  value,
  onChange,
  disabled,
}: ReplySettingsSelectProps) {
  return (
    <div className="flex items-center gap-3">
      <label
        htmlFor="reply-settings"
        className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 shrink-0"
      >
        Who can reply
      </label>
      <select
        id="reply-settings"
        aria-label="Reply settings"
        value={value}
        onChange={(e) => onChange(e.target.value as ReplySettings)}
        disabled={disabled}
        className="rounded border border-input bg-transparent px-2 py-1 text-sm focus:outline-none focus:border-ring/50 disabled:opacity-50"
      >
        {REPLY_SETTINGS.map((setting) => (
          <option key={setting} value={setting}>
            {LABELS[setting]}
          </option>
        ))}
      </select>
    </div>
  );
}
