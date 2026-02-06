import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import {
  getSettings,
  updateProfile,
  updatePreferences,
  deleteAccount,
  exportUserData,
} from "./settings";
import { DEFAULT_PREFERENCES } from "@/lib/validators/settings";

function mockProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    full_name: "Test User",
    email: "test@example.com",
    avatar_url: null,
    bio: null,
    website: null,
    timezone: "UTC",
    preferences: {},
    ...overrides,
  };
}

function setupMockSupabase(options: {
  profile?: ReturnType<typeof mockProfile> | null;
  updateError?: { message: string } | null;
  deleteError?: { message: string } | null;
  posts?: unknown[];
  metrics?: unknown[];
}) {
  const profile = options.profile !== undefined ? options.profile : mockProfile();

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === "profiles") {
        const updateFn = vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: options.updateError ?? null,
          }),
        });
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: profile,
                error: profile ? null : { code: "PGRST116", message: "Not found" },
              }),
            }),
          }),
          update: updateFn,
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: options.deleteError ?? null,
            }),
          }),
        };
      }
      if (table === "posts") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: options.posts ?? [],
              error: null,
            }),
          }),
        };
      }
      if (table === "metric_events") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: options.metrics ?? [],
              error: null,
            }),
          }),
        };
      }
      return {};
    }),
    auth: {
      admin: {
        deleteUser: vi.fn().mockResolvedValue({ error: options.deleteError ?? null }),
      },
    },
  };

  vi.mocked(createAdminClient).mockReturnValue(supabase as never);
  return supabase;
}

describe("settings service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSettings", () => {
    it("returns profile with merged default preferences", async () => {
      setupMockSupabase({});

      const result = await getSettings("user-1");

      expect(result.profile.full_name).toBe("Test User");
      expect(result.profile.email).toBe("test@example.com");
      expect(result.preferences.publishing.auto_save_drafts).toBe(true);
      expect(result.preferences.ai.enabled).toBe(true);
      expect(result.preferences.appearance.theme).toBe("system");
    });

    it("merges saved preferences over defaults", async () => {
      setupMockSupabase({
        profile: mockProfile({
          preferences: {
            ai: { enabled: false, writing_style: "professional" },
            appearance: { theme: "dark" },
          },
        }),
      });

      const result = await getSettings("user-1");

      expect(result.preferences.ai.enabled).toBe(false);
      expect(result.preferences.ai.writing_style).toBe("professional");
      expect(result.preferences.ai.auto_classify).toBe(true); // default preserved
      expect(result.preferences.appearance.theme).toBe("dark");
      expect(result.preferences.publishing.auto_save_drafts).toBe(true); // untouched section
    });

    it("throws when profile not found", async () => {
      setupMockSupabase({ profile: null });

      await expect(getSettings("user-1")).rejects.toThrow();
    });
  });

  describe("updateProfile", () => {
    it("updates profile fields", async () => {
      const client = setupMockSupabase({});

      await updateProfile("user-1", {
        full_name: "New Name",
        bio: "My bio",
      });

      expect(client.from).toHaveBeenCalledWith("profiles");
    });

    it("throws on update error", async () => {
      setupMockSupabase({
        updateError: { message: "Update failed" },
      });

      await expect(
        updateProfile("user-1", { full_name: "Test" }),
      ).rejects.toThrow("Update failed");
    });
  });

  describe("updatePreferences", () => {
    it("merges new preferences into existing ones", async () => {
      const updateFn = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const supabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  preferences: {
                    ai: { enabled: true, writing_style: "casual" },
                  },
                },
                error: null,
              }),
            }),
          }),
          update: updateFn,
        }),
      };
      vi.mocked(createAdminClient).mockReturnValue(supabase as never);

      await updatePreferences("user-1", "ai", {
        writing_style: "professional",
      });

      expect(updateFn).toHaveBeenCalledWith(
        expect.objectContaining({
          preferences: expect.objectContaining({
            ai: expect.objectContaining({
              enabled: true,
              writing_style: "professional",
            }),
          }),
        }),
      );
    });
  });

  describe("deleteAccount", () => {
    it("deletes user via auth admin", async () => {
      const client = setupMockSupabase({});

      await deleteAccount("user-1");

      expect(client.auth.admin.deleteUser).toHaveBeenCalledWith("user-1");
    });

    it("throws on delete error", async () => {
      setupMockSupabase({
        deleteError: { message: "Delete failed" },
      });

      await expect(deleteAccount("user-1")).rejects.toThrow("Delete failed");
    });
  });

  describe("exportUserData", () => {
    it("returns all data when type is 'all'", async () => {
      setupMockSupabase({
        posts: [{ id: "p-1", body: "Hello" }],
        metrics: [{ id: "m-1", impressions: 100 }],
      });

      const result = await exportUserData("user-1", "all", "json");

      expect(result).toHaveProperty("profile");
      expect(result).toHaveProperty("posts");
      expect(result).toHaveProperty("metrics");
    });

    it("returns only posts when type is 'posts'", async () => {
      setupMockSupabase({
        posts: [{ id: "p-1", body: "Hello" }],
      });

      const result = await exportUserData("user-1", "posts", "json");

      expect(result).toHaveProperty("posts");
      expect(result).not.toHaveProperty("metrics");
    });

    it("returns only metrics when type is 'analytics'", async () => {
      setupMockSupabase({
        metrics: [{ id: "m-1", impressions: 100 }],
      });

      const result = await exportUserData("user-1", "analytics", "json");

      expect(result).toHaveProperty("metrics");
      expect(result).not.toHaveProperty("posts");
    });
  });
});
