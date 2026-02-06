import { describe, it, expect } from "vitest";
import {
  updateProfileSchema,
  publishingPrefsSchema,
  aiPrefsSchema,
  notificationPrefsSchema,
  appearancePrefsSchema,
  privacyPrefsSchema,
  deleteAccountSchema,
  exportDataSchema,
  DEFAULT_PREFERENCES,
} from "./settings";

describe("settings validators", () => {
  describe("updateProfileSchema", () => {
    it("accepts valid profile update", () => {
      const result = updateProfileSchema.safeParse({
        full_name: "Test User",
        bio: "A short bio",
        website: "https://example.com",
        timezone: "America/New_York",
      });
      expect(result.success).toBe(true);
    });

    it("accepts partial updates", () => {
      const result = updateProfileSchema.safeParse({ full_name: "Name" });
      expect(result.success).toBe(true);
    });

    it("rejects name over 100 chars", () => {
      const result = updateProfileSchema.safeParse({
        full_name: "x".repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it("rejects bio over 500 chars", () => {
      const result = updateProfileSchema.safeParse({
        bio: "x".repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid website URL", () => {
      const result = updateProfileSchema.safeParse({
        website: "not-a-url",
      });
      expect(result.success).toBe(false);
    });

    it("accepts empty string website to clear it", () => {
      const result = updateProfileSchema.safeParse({ website: "" });
      expect(result.success).toBe(true);
    });

    it("accepts empty string bio to clear it", () => {
      const result = updateProfileSchema.safeParse({ bio: "" });
      expect(result.success).toBe(true);
    });
  });

  describe("publishingPrefsSchema", () => {
    it("accepts valid publishing preferences", () => {
      const result = publishingPrefsSchema.safeParse({
        auto_save_drafts: true,
        confirm_before_publish: false,
        delete_confirmation: true,
      });
      expect(result.success).toBe(true);
    });

    it("accepts partial update", () => {
      const result = publishingPrefsSchema.safeParse({
        auto_save_drafts: false,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("aiPrefsSchema", () => {
    it("accepts valid AI preferences", () => {
      const result = aiPrefsSchema.safeParse({
        enabled: true,
        auto_classify: true,
        content_suggestions: false,
        insights_enabled: true,
        writing_style: "professional",
        custom_instructions: "Keep it brief",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid writing style", () => {
      const result = aiPrefsSchema.safeParse({
        writing_style: "invalid_style",
      });
      expect(result.success).toBe(false);
    });

    it("rejects custom instructions over 1000 chars", () => {
      const result = aiPrefsSchema.safeParse({
        custom_instructions: "x".repeat(1001),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("notificationPrefsSchema", () => {
    it("accepts valid notification preferences", () => {
      const result = notificationPrefsSchema.safeParse({
        email_enabled: true,
        weekly_digest: true,
        digest_day: "monday",
        post_published_email: false,
        post_failed_email: true,
        inapp_enabled: true,
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid digest day", () => {
      const result = notificationPrefsSchema.safeParse({
        digest_day: "funday",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("appearancePrefsSchema", () => {
    it("accepts valid appearance preferences", () => {
      const result = appearancePrefsSchema.safeParse({
        theme: "dark",
        compact_mode: true,
        show_metrics_inline: false,
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid theme", () => {
      const result = appearancePrefsSchema.safeParse({
        theme: "neon",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("privacyPrefsSchema", () => {
    it("accepts valid privacy preferences", () => {
      const result = privacyPrefsSchema.safeParse({
        analytics_collection: false,
        error_reporting: true,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("deleteAccountSchema", () => {
    it("accepts DELETE confirmation", () => {
      const result = deleteAccountSchema.safeParse({
        confirmation: "DELETE",
      });
      expect(result.success).toBe(true);
    });

    it("rejects wrong confirmation text", () => {
      const result = deleteAccountSchema.safeParse({
        confirmation: "delete",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("exportDataSchema", () => {
    it("accepts valid export request", () => {
      const result = exportDataSchema.safeParse({
        type: "all",
        format: "json",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid export type", () => {
      const result = exportDataSchema.safeParse({
        type: "everything",
        format: "json",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid format", () => {
      const result = exportDataSchema.safeParse({
        type: "posts",
        format: "xml",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("DEFAULT_PREFERENCES", () => {
    it("has all preference sections", () => {
      expect(DEFAULT_PREFERENCES).toHaveProperty("publishing");
      expect(DEFAULT_PREFERENCES).toHaveProperty("ai");
      expect(DEFAULT_PREFERENCES).toHaveProperty("notifications");
      expect(DEFAULT_PREFERENCES).toHaveProperty("appearance");
      expect(DEFAULT_PREFERENCES).toHaveProperty("privacy");
    });

    it("has correct publishing defaults", () => {
      expect(DEFAULT_PREFERENCES.publishing.auto_save_drafts).toBe(true);
      expect(DEFAULT_PREFERENCES.publishing.confirm_before_publish).toBe(true);
      expect(DEFAULT_PREFERENCES.publishing.delete_confirmation).toBe(true);
    });

    it("has AI enabled by default", () => {
      expect(DEFAULT_PREFERENCES.ai.enabled).toBe(true);
      expect(DEFAULT_PREFERENCES.ai.auto_classify).toBe(true);
      expect(DEFAULT_PREFERENCES.ai.writing_style).toBe("match_my_style");
    });

    it("has system theme by default", () => {
      expect(DEFAULT_PREFERENCES.appearance.theme).toBe("system");
    });
  });
});
