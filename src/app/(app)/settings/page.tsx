"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  useSettings,
  useUpdateProfile,
  useUpdatePreferences,
  useExportData,
  useDeleteAccount,
  useCreatorProfile,
  useUpdateCreatorProfile,
} from "@/lib/queries/settings";
import { useConnections } from "@/lib/queries/connections";
import {
  useSubscription,
  useUsage,
  useInvoices,
  usePortal,
} from "@/lib/queries/billing";
import { getPlanDisplayName, type PlanType } from "@/lib/stripe/plans";
import {
  WRITING_STYLES,
  DIGEST_DAYS,
  THEMES,
  DEFAULT_PREFERENCES,
  type PreferenceSection,
} from "@/lib/validators/settings";
import { NICHES, GOALS } from "@/lib/validators/onboarding";
import { cn } from "@/lib/utils";

/* ─── Section Navigation ─── */

const SECTIONS = [
  { id: "profile", label: "Profile", icon: "M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5Zm0 2c-3.3 0-10 1.7-10 5v2h20v-2c0-3.3-6.7-5-10-5Z" },
  { id: "creator-profile", label: "Creator Profile", icon: "M12 2L2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5" },
  { id: "account", label: "Account", icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm-1 14H9V8h2v8Zm4 0h-2V8h2v8Z" },
  { id: "platforms", label: "Platforms", icon: "M12 2L2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5" },
  { id: "publishing", label: "Publishing", icon: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25ZM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z" },
  { id: "ai", label: "AI & Intelligence", icon: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-2h2v2Zm0-4h-2V7h2v6Z" },
  { id: "notifications", label: "Notifications", icon: "M12 22c1.1 0 2-.9 2-2h-4a2 2 0 0 0 2 2Zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2Z" },
  { id: "appearance", label: "Appearance", icon: "M12 3a9 9 0 0 0 0 18c.7 0 1.38-.08 2.04-.22a6 6 0 0 1-2.04-4.51V15a3 3 0 0 1 3-3h1.27A9 9 0 0 0 12 3Z" },
  { id: "billing", label: "Billing", icon: "M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2Zm0 14H4V6h16v12ZM4 9h16v2H4V9Z" },
  { id: "data", label: "Data & Privacy", icon: "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4Z" },
  { id: "about", label: "About", icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm1 15h-2v-6h2v6Zm0-8h-2V7h2v2Z" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

/* ─── Reusable Setting Controls ─── */

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground/50">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
        checked ? "bg-primary" : "bg-muted-foreground/25",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-sm transition-transform duration-200",
          checked ? "translate-x-4" : "translate-x-0",
        )}
      />
    </button>
  );
}

function SelectControl({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (val: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded border border-input bg-transparent px-2 text-xs outline-none focus:border-ring/50"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function SectionBlock({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-xl font-normal tracking-tight font-serif">{title}</h2>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground/40">{description}</p>
      )}
      <div className="h-px bg-editorial-rule mt-3 mb-1" />
      <div className="divide-y divide-editorial-rule-subtle">{children}</div>
    </div>
  );
}

function Divider() {
  return <div className="my-2 h-px bg-editorial-rule-subtle" />;
}

/* ─── Section Components ─── */

function ProfileSection({
  profile,
  onSave,
  isSaving,
}: {
  profile: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    bio: string | null;
    website: string | null;
    timezone: string | null;
  };
  onSave: (data: Record<string, string>) => void;
  isSaving: boolean;
}) {
  const [name, setName] = useState(profile.full_name ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [website, setWebsite] = useState(profile.website ?? "");
  const [timezone, setTimezone] = useState(
    profile.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  function debouncedSave(field: string, value: string) {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSave({ [field]: value });
    }, 800);
  }

  const initials = (profile.full_name ?? "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <SectionBlock title="Profile" description="Your personal information">
      {/* Avatar */}
      <div className="flex items-center gap-4 py-3.5">
        <Avatar className="h-14 w-14">
          <AvatarImage src={profile.avatar_url ?? undefined} alt={name} />
          <AvatarFallback className="text-sm font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium">{name || "Your name"}</p>
          <p className="text-xs text-muted-foreground/40">{profile.email}</p>
        </div>
      </div>

      {/* Full name */}
      <div className="py-3.5">
        <label className="mb-1.5 block text-[10px] uppercase tracking-[0.2em] text-editorial-label">Full name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            debouncedSave("full_name", e.target.value);
          }}
          maxLength={100}
          className="h-9 w-full rounded border border-input bg-transparent px-3 text-sm outline-none focus:border-ring/50"
        />
      </div>

      {/* Bio */}
      <div className="py-3.5">
        <label className="mb-1.5 block text-[10px] uppercase tracking-[0.2em] text-editorial-label">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => {
            setBio(e.target.value);
            debouncedSave("bio", e.target.value);
          }}
          maxLength={500}
          rows={3}
          placeholder="Tell us about yourself..."
          className="w-full rounded border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-ring/50 placeholder:text-muted-foreground/25"
        />
        <p className="mt-1 text-right text-xs text-muted-foreground/30 font-mono tabular-nums">
          {bio.length}/500
        </p>
      </div>

      {/* Website */}
      <div className="py-3.5">
        <label className="mb-1.5 block text-[10px] uppercase tracking-[0.2em] text-editorial-label">Website</label>
        <input
          type="url"
          value={website}
          onChange={(e) => {
            setWebsite(e.target.value);
            debouncedSave("website", e.target.value);
          }}
          placeholder="https://yoursite.com"
          className="h-9 w-full rounded border border-input bg-transparent px-3 text-sm outline-none focus:border-ring/50 placeholder:text-muted-foreground/25"
        />
      </div>

      {/* Timezone */}
      <SettingRow label="Timezone" description="Used for scheduling posts">
        <input
          type="text"
          value={timezone}
          onChange={(e) => {
            setTimezone(e.target.value);
            debouncedSave("timezone", e.target.value);
          }}
          className="h-8 w-48 rounded border border-input bg-transparent px-2 text-xs outline-none focus:border-ring/50"
        />
      </SettingRow>

      {isSaving && (
        <p className="py-2 text-xs text-muted-foreground/30">Saving...</p>
      )}
    </SectionBlock>
  );
}

function CreatorProfileSection() {
  const { data, isLoading } = useCreatorProfile();
  const updateCreatorProfile = useUpdateCreatorProfile();

  const profile = data?.profile;
  const [niches, setNiches] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [targetAudience, setTargetAudience] = useState("");
  const [initialized, setInitialized] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (profile && !initialized) {
      setNiches(profile.niches ?? []);
      setGoals(profile.goals ?? []);
      setTargetAudience(profile.target_audience ?? "");
      setInitialized(true);
    }
  }, [profile, initialized]);

  function handleSave(data: Record<string, unknown>) {
    updateCreatorProfile.mutate(data as never, {
      onSuccess: () => toast.success("Creator profile updated"),
      onError: () => toast.error("Failed to update creator profile"),
    });
  }

  function toggleNiche(value: string) {
    const newNiches = niches.includes(value)
      ? niches.filter((n) => n !== value)
      : niches.length < 3
        ? [...niches, value]
        : niches;
    if (newNiches.length === 0) return;
    setNiches(newNiches);
    handleSave({ niches: newNiches });
  }

  function toggleGoal(value: string) {
    const newGoals = goals.includes(value)
      ? goals.filter((g) => g !== value)
      : goals.length < 3
        ? [...goals, value]
        : goals;
    if (newGoals.length === 0) return;
    setGoals(newGoals);
    handleSave({ goals: newGoals });
  }

  if (isLoading) {
    return (
      <SectionBlock title="Creator Profile" description="Your content niches, goals, and audience">
        <div className="py-3.5">
          <Skeleton className="h-20 w-full" />
        </div>
      </SectionBlock>
    );
  }

  return (
    <SectionBlock
      title="Creator Profile"
      description="Your content niches, goals, and audience"
    >
      {/* Niches */}
      <div className="py-3.5">
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-[10px] uppercase tracking-[0.2em] text-editorial-label">
            Niches
          </label>
          <span className="text-[10px] font-mono tabular-nums text-muted-foreground/30">
            {niches.length}/3 selected
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {NICHES.filter((n) => n.value !== "other").map((niche) => (
            <button
              key={niche.value}
              type="button"
              data-testid={`niche-chip-${niche.value}`}
              data-selected={niches.includes(niche.value) ? "true" : "false"}
              onClick={() => toggleNiche(niche.value)}
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1.5 text-xs transition-all duration-200",
                niches.includes(niche.value)
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-input/60 text-muted-foreground/60 hover:border-input hover:text-muted-foreground",
                niches.length >= 3 &&
                  !niches.includes(niche.value) &&
                  "opacity-40 cursor-not-allowed",
              )}
            >
              {niche.label}
            </button>
          ))}
        </div>
      </div>

      {/* Goals */}
      <div className="py-3.5">
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-[10px] uppercase tracking-[0.2em] text-editorial-label">
            Goals
          </label>
          <span className="text-[10px] font-mono tabular-nums text-muted-foreground/30">
            {goals.length}/3 selected
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {GOALS.map((goal) => (
            <button
              key={goal.value}
              type="button"
              data-testid={`goal-chip-${goal.value}`}
              data-selected={goals.includes(goal.value) ? "true" : "false"}
              onClick={() => toggleGoal(goal.value)}
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1.5 text-xs transition-all duration-200",
                goals.includes(goal.value)
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-input/60 text-muted-foreground/60 hover:border-input hover:text-muted-foreground",
                goals.length >= 3 &&
                  !goals.includes(goal.value) &&
                  "opacity-40 cursor-not-allowed",
              )}
            >
              {goal.label}
            </button>
          ))}
        </div>
      </div>

      {/* Target Audience */}
      <div className="py-3.5">
        <label className="mb-1.5 block text-[10px] uppercase tracking-[0.2em] text-editorial-label">
          Target audience
        </label>
        <input
          type="text"
          value={targetAudience}
          onChange={(e) => {
            setTargetAudience(e.target.value);
            clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
              handleSave({ target_audience: e.target.value });
            }, 800);
          }}
          maxLength={100}
          placeholder="e.g., SaaS founders, indie hackers..."
          className="h-9 w-full rounded border border-input bg-transparent px-3 text-sm outline-none focus:border-ring/50 placeholder:text-muted-foreground/25"
        />
      </div>
    </SectionBlock>
  );
}

function AccountSection({
  email,
  onDelete,
}: {
  email: string | null;
  onDelete: () => void;
}) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  return (
    <>
      <SectionBlock title="Account" description="Account management and security">
        <SettingRow label="Email" description="Your account email (read-only)">
          <span className="text-sm text-muted-foreground/50">{email ?? "—"}</span>
        </SettingRow>

        <SettingRow label="Authentication" description="Sign in via Google">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success-muted px-2 py-0.5 text-xs font-medium text-success ring-1 ring-inset ring-success/20">
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            Connected
          </span>
        </SettingRow>

        <Divider />

        <div className="py-3.5">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-destructive">
            Danger Zone
          </h3>
          <p className="mt-1 text-xs text-muted-foreground/40">
            Permanently delete your account and all associated data.
          </p>
          <Button
            variant="destructive"
            size="sm"
            className="mt-3"
            onClick={() => setShowDeleteModal(true)}
          >
            Delete Account
          </Button>
        </div>
      </SectionBlock>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
            <h3 className="text-lg font-serif text-destructive">
              Delete Account
            </h3>
            <p className="mt-2 text-sm text-muted-foreground/50">
              This will permanently delete your account, all posts, metrics,
              connections, and AI data. This action cannot be undone.
            </p>
            <div className="mt-4">
              <label className="mb-1.5 block text-[10px] uppercase tracking-[0.2em] text-editorial-label">
                Type <span className="font-mono font-bold">DELETE</span> to
                confirm
              </label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
                className="h-9 w-full rounded border border-input bg-transparent px-3 text-sm outline-none focus:border-destructive placeholder:text-muted-foreground/25"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirm("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleteConfirm !== "DELETE"}
                onClick={() => {
                  onDelete();
                  setShowDeleteModal(false);
                }}
              >
                Delete permanently
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PlatformsSection() {
  const { data: connections, isLoading } = useConnections();

  const twitterConn = connections?.find(
    (c: { platform: string }) => c.platform === "twitter",
  );

  return (
    <SectionBlock
      title="Platforms"
      description="Manage your connected social media accounts"
    >
      {isLoading ? (
        <div className="py-3.5">
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <>
          <SettingRow
            label="X"
            description={
              twitterConn
                ? `@${twitterConn.platform_username}`
                : "Not connected"
            }
          >
            {twitterConn ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success-muted px-2 py-0.5 text-xs font-medium text-success ring-1 ring-inset ring-success/20">
                Active
              </span>
            ) : (
              <Button asChild variant="outline" size="sm">
                <a href="/api/connections/twitter">Connect</a>
              </Button>
            )}
          </SettingRow>

          <SettingRow label="LinkedIn" description="Coming soon">
            <span className="text-xs text-muted-foreground/30">Coming soon</span>
          </SettingRow>

          <SettingRow label="Threads" description="Coming soon">
            <span className="text-xs text-muted-foreground/30">Coming soon</span>
          </SettingRow>
        </>
      )}

      <div className="pt-2">
        <Link
          href="/connections"
          className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 hover:text-foreground transition-colors"
        >
          Manage all connections &rarr;
        </Link>
      </div>
    </SectionBlock>
  );
}

function PublishingSection({
  prefs,
  onUpdate,
}: {
  prefs: typeof DEFAULT_PREFERENCES.publishing;
  onUpdate: (settings: Record<string, unknown>) => void;
}) {
  return (
    <SectionBlock
      title="Publishing"
      description="Default behaviors for creating and publishing content"
    >
      <SettingRow
        label="Auto-save drafts"
        description="Automatically save your work"
      >
        <Toggle
          checked={prefs.auto_save_drafts}
          onChange={(val) => onUpdate({ auto_save_drafts: val })}
        />
      </SettingRow>

      <SettingRow
        label="Confirm before publish"
        description="Show a confirmation dialog before publishing"
      >
        <Toggle
          checked={prefs.confirm_before_publish}
          onChange={(val) => onUpdate({ confirm_before_publish: val })}
        />
      </SettingRow>

      <SettingRow
        label="Delete confirmation"
        description="Require confirmation before deleting posts"
      >
        <Toggle
          checked={prefs.delete_confirmation}
          onChange={(val) => onUpdate({ delete_confirmation: val })}
        />
      </SettingRow>
    </SectionBlock>
  );
}

function AiSection({
  prefs,
  onUpdate,
}: {
  prefs: typeof DEFAULT_PREFERENCES.ai;
  onUpdate: (settings: Record<string, unknown>) => void;
}) {
  const [customInstructions, setCustomInstructions] = useState<string>(
    prefs.custom_instructions,
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  return (
    <SectionBlock
      title="AI & Intelligence"
      description="Control how AI features behave"
    >
      <SettingRow
        label="Enable AI features"
        description="Master toggle for all AI functionality"
      >
        <Toggle
          checked={prefs.enabled}
          onChange={(val) => onUpdate({ enabled: val })}
        />
      </SettingRow>

      <SettingRow
        label="Auto-classify posts"
        description="Automatically tag intent, type, and topics"
      >
        <Toggle
          checked={prefs.auto_classify}
          onChange={(val) => onUpdate({ auto_classify: val })}
          disabled={!prefs.enabled}
        />
      </SettingRow>

      <SettingRow
        label="Content suggestions"
        description="Show AI writing suggestions"
      >
        <Toggle
          checked={prefs.content_suggestions}
          onChange={(val) => onUpdate({ content_suggestions: val })}
          disabled={!prefs.enabled}
        />
      </SettingRow>

      <SettingRow
        label="AI insights"
        description="Generate performance insights"
      >
        <Toggle
          checked={prefs.insights_enabled}
          onChange={(val) => onUpdate({ insights_enabled: val })}
          disabled={!prefs.enabled}
        />
      </SettingRow>

      <SettingRow label="Writing style" description="How AI should write">
        <SelectControl
          value={prefs.writing_style}
          options={WRITING_STYLES.map((s) => ({
            value: s,
            label: s
              .replace(/_/g, " ")
              .replace(/^\w/, (c) => c.toUpperCase()),
          }))}
          onChange={(val) => onUpdate({ writing_style: val })}
        />
      </SettingRow>

      <div className="py-3.5">
        <label className="mb-1.5 block text-[10px] uppercase tracking-[0.2em] text-editorial-label">
          Custom instructions
        </label>
        <p className="mb-2 text-xs text-muted-foreground/40">
          Give the AI specific guidance about your writing preferences
        </p>
        <textarea
          value={customInstructions}
          onChange={(e) => {
            setCustomInstructions(e.target.value);
            clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
              onUpdate({ custom_instructions: e.target.value });
            }, 800);
          }}
          maxLength={1000}
          rows={3}
          placeholder="e.g., Keep posts under 200 characters, use more data-driven arguments..."
          disabled={!prefs.enabled}
          className="w-full rounded border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-ring/50 disabled:cursor-not-allowed disabled:opacity-50 placeholder:text-muted-foreground/25"
        />
        <p className="mt-1 text-right text-xs text-muted-foreground/30 font-mono tabular-nums">
          {customInstructions.length}/1000
        </p>
      </div>
    </SectionBlock>
  );
}

function NotificationsSection({
  prefs,
  onUpdate,
}: {
  prefs: typeof DEFAULT_PREFERENCES.notifications;
  onUpdate: (settings: Record<string, unknown>) => void;
}) {
  return (
    <SectionBlock
      title="Notifications"
      description="Control what notifications you receive"
    >
      <h3 className="pt-2 text-[9px] uppercase tracking-[0.25em] text-editorial-label">
        Email
      </h3>

      <SettingRow label="Email notifications" description="Master toggle">
        <Toggle
          checked={prefs.email_enabled}
          onChange={(val) => onUpdate({ email_enabled: val })}
        />
      </SettingRow>

      <SettingRow label="Weekly digest" description="Performance summary">
        <Toggle
          checked={prefs.weekly_digest}
          onChange={(val) => onUpdate({ weekly_digest: val })}
          disabled={!prefs.email_enabled}
        />
      </SettingRow>

      <SettingRow label="Digest day">
        <SelectControl
          value={prefs.digest_day}
          options={DIGEST_DAYS.map((d) => ({
            value: d,
            label: d.charAt(0).toUpperCase() + d.slice(1),
          }))}
          onChange={(val) => onUpdate({ digest_day: val })}
        />
      </SettingRow>

      <SettingRow
        label="Post published"
        description="Email when scheduled post publishes"
      >
        <Toggle
          checked={prefs.post_published_email}
          onChange={(val) => onUpdate({ post_published_email: val })}
          disabled={!prefs.email_enabled}
        />
      </SettingRow>

      <SettingRow
        label="Post failed"
        description="Email when post fails to publish"
      >
        <Toggle
          checked={prefs.post_failed_email}
          onChange={(val) => onUpdate({ post_failed_email: val })}
          disabled={!prefs.email_enabled}
        />
      </SettingRow>

      <SettingRow
        label="Connection issues"
        description="Email when platform needs attention"
      >
        <Toggle
          checked={prefs.connection_issues_email}
          onChange={(val) => onUpdate({ connection_issues_email: val })}
          disabled={!prefs.email_enabled}
        />
      </SettingRow>

      <SettingRow
        label="Insights available"
        description="Email when new insights generated"
      >
        <Toggle
          checked={prefs.insights_available_email}
          onChange={(val) => onUpdate({ insights_available_email: val })}
          disabled={!prefs.email_enabled}
        />
      </SettingRow>

      <Divider />

      <h3 className="pt-2 text-[9px] uppercase tracking-[0.25em] text-editorial-label">
        In-App
      </h3>

      <SettingRow label="In-app notifications" description="Master toggle">
        <Toggle
          checked={prefs.inapp_enabled}
          onChange={(val) => onUpdate({ inapp_enabled: val })}
        />
      </SettingRow>

      <SettingRow label="Post published" description="Toast when post publishes">
        <Toggle
          checked={prefs.inapp_post_published}
          onChange={(val) => onUpdate({ inapp_post_published: val })}
          disabled={!prefs.inapp_enabled}
        />
      </SettingRow>

      <SettingRow label="Post failed" description="Alert when post fails">
        <Toggle
          checked={prefs.inapp_post_failed}
          onChange={(val) => onUpdate({ inapp_post_failed: val })}
          disabled={!prefs.inapp_enabled}
        />
      </SettingRow>

      <SettingRow
        label="New insights"
        description="Badge when insights available"
      >
        <Toggle
          checked={prefs.inapp_new_insights}
          onChange={(val) => onUpdate({ inapp_new_insights: val })}
          disabled={!prefs.inapp_enabled}
        />
      </SettingRow>
    </SectionBlock>
  );
}

function AppearanceSection({
  prefs,
  onUpdate,
}: {
  prefs: typeof DEFAULT_PREFERENCES.appearance;
  onUpdate: (settings: Record<string, unknown>) => void;
}) {
  const { setTheme } = useTheme();

  return (
    <SectionBlock title="Appearance" description="Customize the look and feel">
      <SettingRow label="Theme" description="Choose your preferred theme">
        <div className="flex gap-1">
          {THEMES.map((theme) => (
            <button
              key={theme}
              type="button"
              onClick={() => {
                setTheme(theme);
                onUpdate({ theme });
              }}
              className={cn(
                "rounded px-3 py-1 text-[11px] uppercase tracking-[0.1em] transition-colors",
                prefs.theme === theme
                  ? "bg-foreground text-background"
                  : "text-muted-foreground/40 hover:text-foreground",
              )}
            >
              {theme.charAt(0).toUpperCase() + theme.slice(1)}
            </button>
          ))}
        </div>
      </SettingRow>

      <SettingRow label="Compact mode" description="Use a denser UI layout">
        <Toggle
          checked={prefs.compact_mode}
          onChange={(val) => onUpdate({ compact_mode: val })}
        />
      </SettingRow>

      <SettingRow
        label="Show metrics inline"
        description="Display metrics on post cards"
      >
        <Toggle
          checked={prefs.show_metrics_inline}
          onChange={(val) => onUpdate({ show_metrics_inline: val })}
        />
      </SettingRow>
    </SectionBlock>
  );
}

function DataPrivacySection({
  prefs,
  onUpdate,
  onExport,
  isExporting,
  onDelete,
}: {
  prefs: typeof DEFAULT_PREFERENCES.privacy;
  onUpdate: (settings: Record<string, unknown>) => void;
  onExport: (type: "all" | "posts" | "analytics") => void;
  isExporting: boolean;
  onDelete: () => void;
}) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  return (
    <>
      <SectionBlock
        title="Data & Privacy"
        description="Control your data and privacy settings"
      >
        <h3 className="pt-2 text-[9px] uppercase tracking-[0.25em] text-editorial-label">
          Export
        </h3>

        <div className="flex flex-wrap gap-2 py-3.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExport("all")}
            disabled={isExporting}
          >
            {isExporting ? "Exporting..." : "Export all data"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExport("posts")}
            disabled={isExporting}
          >
            Export posts
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExport("analytics")}
            disabled={isExporting}
          >
            Export analytics
          </Button>
        </div>

        <Divider />

        <h3 className="pt-2 text-[9px] uppercase tracking-[0.25em] text-editorial-label">
          Privacy
        </h3>

        <SettingRow
          label="Analytics collection"
          description="Help improve the product"
        >
          <Toggle
            checked={prefs.analytics_collection}
            onChange={(val) => onUpdate({ analytics_collection: val })}
          />
        </SettingRow>

        <SettingRow
          label="Error reporting"
          description="Send error reports automatically"
        >
          <Toggle
            checked={prefs.error_reporting}
            onChange={(val) => onUpdate({ error_reporting: val })}
          />
        </SettingRow>

        <Divider />

        <div className="py-3.5">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-destructive">
            Danger Zone
          </h3>
          <p className="mt-1 text-xs text-muted-foreground/40">
            Permanently delete your account and all data.
          </p>
          <Button
            variant="destructive"
            size="sm"
            className="mt-3"
            onClick={() => setShowDeleteModal(true)}
          >
            Delete Account
          </Button>
        </div>
      </SectionBlock>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
            <h3 className="text-lg font-serif text-destructive">
              Delete Account
            </h3>
            <p className="mt-2 text-sm text-muted-foreground/50">
              This is irreversible. All your data will be permanently deleted.
            </p>
            <div className="mt-4">
              <label className="mb-1.5 block text-[10px] uppercase tracking-[0.2em] text-editorial-label">
                Type <span className="font-mono font-bold">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
                className="h-9 w-full rounded border border-input bg-transparent px-3 text-sm outline-none focus:border-destructive placeholder:text-muted-foreground/25"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirm("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleteConfirm !== "DELETE"}
                onClick={() => {
                  onDelete();
                  setShowDeleteModal(false);
                }}
              >
                Delete permanently
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AboutSection() {
  return (
    <SectionBlock title="About" description="App information and support">
      <SettingRow label="Version" description="Current application version">
        <span className="text-xs font-mono text-muted-foreground/40">1.0.0</span>
      </SettingRow>

      <SettingRow
        label="Help & Support"
        description="Get help with AiGrow"
      >
        <span className="text-xs text-muted-foreground/40">
          support@creatorgrowthos.com
        </span>
      </SettingRow>

      <Divider />

      <div className="py-3.5">
        <p className="text-xs text-muted-foreground/40">
          Built for creators who want to grow intentionally.
        </p>
        <p className="mt-1 text-xs text-muted-foreground/25">
          &copy; {new Date().getFullYear()} AiGrow
        </p>
      </div>
    </SectionBlock>
  );
}

/* ─── Billing Section ─── */

const BILLING_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "bg-success-muted text-success ring-1 ring-inset ring-success/20" },
  trialing: { label: "Trial", color: "bg-info-muted text-info ring-1 ring-inset ring-info/20" },
  past_due: { label: "Past Due", color: "bg-warning-muted text-warning ring-1 ring-inset ring-warning/20" },
  canceled: { label: "Canceled", color: "bg-destructive-muted text-destructive ring-1 ring-inset ring-destructive/20" },
  unpaid: { label: "Unpaid", color: "bg-destructive-muted text-destructive ring-1 ring-inset ring-destructive/20" },
};

function UsageMeter({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
  const isNearLimit = !isUnlimited && percentage >= 80;

  return (
    <div className="py-2.5">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm text-foreground">{label}</span>
        <span className="text-xs font-mono tabular-nums text-muted-foreground/50">
          {isUnlimited ? `${used} (Unlimited)` : `${used} / ${limit}`}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted-foreground/10">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isUnlimited
              ? "bg-primary/20"
              : isNearLimit
                ? "bg-warning"
                : "bg-primary/60"
          )}
          style={{ width: isUnlimited ? "8%" : `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function formatBillingCurrency(amountCents: number): string {
  return `$${(amountCents / 100).toFixed(2)}`;
}

function formatBillingDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getDaysRemaining(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

function BillingSection() {
  const { data: subscription, isLoading: subLoading } = useSubscription();
  const { data: usage, isLoading: usageLoading } = useUsage();
  const { data: invoices, isLoading: invoicesLoading } = useInvoices();
  const portal = usePortal();

  const isLoading = subLoading || usageLoading || invoicesLoading;

  function handleManage() {
    portal.mutate(undefined, {
      onSuccess: (url) => {
        if (url) window.location.href = url;
      },
    });
  }

  return (
    <SectionBlock
      title="Billing & Subscription"
      description="Manage your plan, usage, and billing details"
    >
      {isLoading ? (
        <div className="space-y-4 py-3.5">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : !subscription ? (
        <div className="py-6 text-center">
          <p className="text-sm text-muted-foreground/50">
            No active subscription. Choose a plan to get started.
          </p>
          <Button asChild variant="coral" size="sm" className="mt-3">
            <Link href="/pricing">View Plans</Link>
          </Button>
        </div>
      ) : (
        <>
          {/* Current Plan */}
          <div className="py-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-medium">
                  {getPlanDisplayName(subscription.plan as PlanType)}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    BILLING_STATUS_LABELS[subscription.status]?.color ??
                      "bg-secondary text-muted-foreground"
                  )}
                >
                  {BILLING_STATUS_LABELS[subscription.status]?.label ??
                    subscription.status}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleManage}
                loading={portal.isPending}
              >
                Manage Subscription
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground/40">
              {subscription.billing_cycle === "yearly"
                ? "Annual billing"
                : "Monthly billing"}
              {subscription.current_period_end &&
                ` · Renews ${formatBillingDate(subscription.current_period_end)}`}
            </p>
          </div>

          {/* Trial notice */}
          {subscription.status === "trialing" && subscription.trial_end && (
            <div className="my-2 rounded-lg border border-info/20 bg-info-muted px-3 py-2.5">
              <p className="text-xs text-info">
                <strong>{getDaysRemaining(subscription.trial_end)} days remaining</strong>{" "}
                in your free trial. Your card will be charged on{" "}
                {formatBillingDate(subscription.trial_end)}.
              </p>
            </div>
          )}

          {/* Cancel notice */}
          {subscription.cancel_at_period_end && (
            <div className="my-2 rounded-lg border border-warning/20 bg-warning-muted px-3 py-2.5">
              <p className="text-xs text-warning">
                Your subscription will end on{" "}
                {subscription.current_period_end
                  ? formatBillingDate(subscription.current_period_end)
                  : "the end of your billing period"}
                .
              </p>
            </div>
          )}

          {/* Usage */}
          {usage && (
            <>
              <Divider />
              <div className="py-1">
                <h3 className="pt-2 text-[9px] uppercase tracking-[0.25em] text-editorial-label">
                  Usage This Period
                </h3>
                <UsageMeter
                  label="Posts"
                  used={usage.posts_used}
                  limit={usage.posts_limit}
                />
                <UsageMeter
                  label="AI Improvements"
                  used={usage.ai_improvements_used}
                  limit={usage.ai_improvements_limit}
                />
                <UsageMeter
                  label="Insights"
                  used={usage.insights_used}
                  limit={usage.insights_limit}
                />
              </div>
            </>
          )}

          {/* Invoices */}
          {invoices && invoices.length > 0 && (
            <>
              <Divider />
              <div className="py-1">
                <h3 className="pt-2 pb-2 text-[9px] uppercase tracking-[0.25em] text-editorial-label">
                  Billing History
                </h3>
                <div className="space-y-1.5">
                  {(invoices as Array<{
                    id: string;
                    amount: number;
                    status: string;
                    invoice_url?: string;
                    created_at?: string;
                  }>).map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between rounded border border-border/30 px-3 py-2"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono tabular-nums font-medium">
                          {formatBillingCurrency(invoice.amount)}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                            invoice.status === "paid"
                              ? "bg-success-muted text-success"
                              : "bg-secondary text-muted-foreground"
                          )}
                        >
                          {invoice.status === "paid" ? "Paid" : invoice.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {invoice.created_at && (
                          <span className="text-[11px] font-mono tabular-nums text-muted-foreground/40">
                            {formatBillingDate(invoice.created_at)}
                          </span>
                        )}
                        {invoice.invoice_url && (
                          <a
                            href={invoice.invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-primary hover:underline"
                          >
                            View
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </SectionBlock>
  );
}

/* ─── Loading Skeleton ─── */

function SettingsSkeleton() {
  return (
    <div className="space-y-8">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i}>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-2 h-3 w-48" />
          <div className="h-px bg-editorial-rule-subtle mt-3 mb-1" />
          <div className="space-y-4 mt-4">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="h-5 w-9 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Main Page ─── */

export default function SettingsPage() {
  const { data, isLoading } = useSettings();
  const updateProfile = useUpdateProfile();
  const updatePreferences = useUpdatePreferences();
  const exportData = useExportData();
  const deleteAccount = useDeleteAccount();
  const [activeSection, setActiveSection] = useState<SectionId>("profile");

  function handleProfileSave(fields: Record<string, string>) {
    updateProfile.mutate(fields as never, {
      onSuccess: () => toast.success("Profile updated"),
      onError: () => toast.error("Failed to update profile"),
    });
  }

  function handlePrefUpdate(
    section: PreferenceSection,
    settings: Record<string, unknown>,
  ) {
    updatePreferences.mutate(
      { section, settings },
      {
        onError: () => toast.error("Failed to save setting"),
      },
    );
  }

  function handleExport(type: "all" | "posts" | "analytics") {
    exportData.mutate(
      { type, format: "json" },
      {
        onSuccess: (result) => {
          const blob = new Blob([JSON.stringify(result.data, null, 2)], {
            type: "application/json",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `creatorgrowthos-${type}-export.json`;
          a.click();
          URL.revokeObjectURL(url);
          toast.success("Export downloaded");
        },
        onError: () => toast.error("Export failed"),
      },
    );
  }

  function handleDeleteAccount() {
    deleteAccount.mutate(
      { confirmation: "DELETE" },
      {
        onSuccess: () => {
          toast.success("Account deleted");
          window.location.href = "/login";
        },
        onError: () => toast.error("Failed to delete account"),
      },
    );
  }

  const prefs = data?.preferences ?? DEFAULT_PREFERENCES;

  return (
    <div className="w-full">
      {/* ── Masthead ── */}
      <h1 className="text-3xl font-normal tracking-tight font-serif">
        Settings
      </h1>
      <p className="text-sm text-muted-foreground/50 mt-2">
        Manage your account, preferences, and app behavior.
      </p>
      <div className="h-px bg-editorial-rule mt-4 mb-8" />

      <div className="flex gap-8">
        {/* Side navigation */}
        <nav className="hidden w-40 shrink-0 lg:block">
          <div className="sticky top-6 space-y-0.5">
            <p className="px-2.5 pb-2 text-[9px] uppercase tracking-[0.25em] text-editorial-label">
              Sections
            </p>
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left text-[13px] transition-colors",
                  activeSection === section.id
                    ? "text-foreground border-l-2 border-foreground/60 pl-[8px]"
                    : "text-muted-foreground/40 hover:text-foreground/80",
                )}
              >
                {section.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Mobile section select */}
        <div className="w-full lg:hidden">
          <select
            value={activeSection}
            onChange={(e) => setActiveSection(e.target.value as SectionId)}
            className="mb-6 h-9 w-full rounded border border-input bg-transparent px-3 text-sm outline-none"
          >
            {SECTIONS.map((section) => (
              <option key={section.id} value={section.id}>
                {section.label}
              </option>
            ))}
          </select>
        </div>

        {/* Content area */}
        <div className="min-w-0 flex-1">
          {isLoading ? (
            <SettingsSkeleton />
          ) : (
            <>
              {activeSection === "profile" && data?.profile && (
                <ProfileSection
                  profile={data.profile}
                  onSave={handleProfileSave}
                  isSaving={updateProfile.isPending}
                />
              )}

              {activeSection === "creator-profile" && (
                <CreatorProfileSection />
              )}

              {activeSection === "account" && (
                <AccountSection
                  email={data?.profile?.email ?? null}
                  onDelete={handleDeleteAccount}
                />
              )}

              {activeSection === "platforms" && <PlatformsSection />}

              {activeSection === "publishing" && (
                <PublishingSection
                  prefs={prefs.publishing}
                  onUpdate={(s) => handlePrefUpdate("publishing", s)}
                />
              )}

              {activeSection === "ai" && (
                <AiSection
                  prefs={prefs.ai}
                  onUpdate={(s) => handlePrefUpdate("ai", s)}
                />
              )}

              {activeSection === "notifications" && (
                <NotificationsSection
                  prefs={prefs.notifications}
                  onUpdate={(s) => handlePrefUpdate("notifications", s)}
                />
              )}

              {activeSection === "appearance" && (
                <AppearanceSection
                  prefs={prefs.appearance}
                  onUpdate={(s) => handlePrefUpdate("appearance", s)}
                />
              )}

              {activeSection === "billing" && <BillingSection />}

              {activeSection === "data" && (
                <DataPrivacySection
                  prefs={prefs.privacy}
                  onUpdate={(s) => handlePrefUpdate("privacy", s)}
                  onExport={handleExport}
                  isExporting={exportData.isPending}
                  onDelete={handleDeleteAccount}
                />
              )}

              {activeSection === "about" && <AboutSection />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
