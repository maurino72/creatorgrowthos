import { z } from "zod";

// ─── Profile ───

export const updateProfileSchema = z.object({
  full_name: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  website: z
    .union([z.string().url(), z.literal("")])
    .optional(),
  timezone: z.string().min(1).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// ─── Publishing Preferences ───

export const publishingPrefsSchema = z.object({
  auto_save_drafts: z.boolean().optional(),
  confirm_before_publish: z.boolean().optional(),
  delete_confirmation: z.boolean().optional(),
}).partial();

export type PublishingPrefs = z.infer<typeof publishingPrefsSchema>;

// ─── AI Preferences ───

export const WRITING_STYLES = [
  "match_my_style",
  "professional",
  "casual",
  "friendly",
  "authoritative",
  "custom",
] as const;

export const aiPrefsSchema = z.object({
  enabled: z.boolean().optional(),
  auto_classify: z.boolean().optional(),
  content_suggestions: z.boolean().optional(),
  insights_enabled: z.boolean().optional(),
  writing_style: z.enum(WRITING_STYLES).optional(),
  custom_instructions: z.string().max(1000).optional(),
}).partial();

export type AiPrefs = z.infer<typeof aiPrefsSchema>;

// ─── Notification Preferences ───

export const DIGEST_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export const notificationPrefsSchema = z.object({
  email_enabled: z.boolean().optional(),
  weekly_digest: z.boolean().optional(),
  digest_day: z.enum(DIGEST_DAYS).optional(),
  post_published_email: z.boolean().optional(),
  post_failed_email: z.boolean().optional(),
  connection_issues_email: z.boolean().optional(),
  insights_available_email: z.boolean().optional(),
  inapp_enabled: z.boolean().optional(),
  inapp_post_published: z.boolean().optional(),
  inapp_post_failed: z.boolean().optional(),
  inapp_new_insights: z.boolean().optional(),
}).partial();

export type NotificationPrefs = z.infer<typeof notificationPrefsSchema>;

// ─── Appearance Preferences ───

export const THEMES = ["light", "dark", "system"] as const;

export const appearancePrefsSchema = z.object({
  theme: z.enum(THEMES).optional(),
  compact_mode: z.boolean().optional(),
  show_metrics_inline: z.boolean().optional(),
}).partial();

export type AppearancePrefs = z.infer<typeof appearancePrefsSchema>;

// ─── Privacy Preferences ───

export const privacyPrefsSchema = z.object({
  analytics_collection: z.boolean().optional(),
  error_reporting: z.boolean().optional(),
}).partial();

export type PrivacyPrefs = z.infer<typeof privacyPrefsSchema>;

// ─── Preference Sections Map ───

export const preferenceSectionSchemas = {
  publishing: publishingPrefsSchema,
  ai: aiPrefsSchema,
  notifications: notificationPrefsSchema,
  appearance: appearancePrefsSchema,
  privacy: privacyPrefsSchema,
} as const;

export type PreferenceSection = keyof typeof preferenceSectionSchemas;

// ─── Delete Account ───

export const deleteAccountSchema = z.object({
  confirmation: z.literal("DELETE"),
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

// ─── Data Export ───

export const exportDataSchema = z.object({
  type: z.enum(["all", "posts", "analytics"]),
  format: z.enum(["json", "csv"]),
});

export type ExportDataInput = z.infer<typeof exportDataSchema>;

// ─── Default Preferences ───

export const DEFAULT_PREFERENCES = {
  publishing: {
    auto_save_drafts: true,
    confirm_before_publish: true,
    delete_confirmation: true,
  },
  ai: {
    enabled: true,
    auto_classify: true,
    content_suggestions: true,
    insights_enabled: true,
    writing_style: "match_my_style" as const,
    custom_instructions: "",
  },
  notifications: {
    email_enabled: true,
    weekly_digest: true,
    digest_day: "monday" as const,
    post_published_email: false,
    post_failed_email: true,
    connection_issues_email: true,
    insights_available_email: true,
    inapp_enabled: true,
    inapp_post_published: true,
    inapp_post_failed: true,
    inapp_new_insights: true,
  },
  appearance: {
    theme: "dark" as const,
    compact_mode: false,
    show_metrics_inline: true,
  },
  privacy: {
    analytics_collection: true,
    error_reporting: true,
  },
} as const;

export type UserPreferences = typeof DEFAULT_PREFERENCES;
