import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/adapters", () => ({
  getAdapterForPlatform: vi.fn(),
}));

vi.mock("@/lib/services/connections", () => ({
  getConnectionByPlatform: vi.fn(),
  updateTokens: vi.fn(),
}));

vi.mock("@/lib/utils/encryption", () => ({
  decrypt: vi.fn((val: string) => val.replace("encrypted:", "")),
}));

vi.mock("@/lib/services/media", () => ({
  downloadImage: vi.fn(),
  deleteImage: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { getAdapterForPlatform } from "@/lib/adapters";
import {
  getConnectionByPlatform,
  updateTokens,
} from "@/lib/services/connections";
import { decrypt } from "@/lib/utils/encryption";
import { downloadImage, deleteImage } from "@/lib/services/media";
import { publishPost, buildPublishText } from "./publishing";

const TEST_USER_ID = "user-123";
const TEST_POST_ID = "post-1";

function mockSupabase() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
  };

  for (const method of Object.keys(chain)) {
    chain[method].mockReturnValue(chain);
  }

  const from = vi.fn().mockReturnValue(chain);
  vi.mocked(createAdminClient).mockReturnValue({ from } as never);

  return { from, chain };
}

function mockAdapter(overrides: Record<string, unknown> = {}) {
  const adapter = {
    publishPost: vi.fn().mockResolvedValue({
      platformPostId: "tw-post-123",
      platformUrl: "https://twitter.com/i/status/tw-post-123",
      publishedAt: new Date(),
    }),
    refreshTokens: vi.fn().mockResolvedValue({
      accessToken: "new-access",
      refreshToken: "new-refresh",
      expiresAt: new Date(Date.now() + 7200000),
    }),
    uploadMedia: vi.fn().mockResolvedValue("media-id-1"),
    ...overrides,
  };
  vi.mocked(getAdapterForPlatform).mockReturnValue(adapter as never);
  return adapter;
}

function mockConnection(overrides: Record<string, unknown> = {}) {
  const connection = {
    id: "conn-1",
    platform: "twitter",
    status: "active",
    access_token_enc: "encrypted:access-token",
    refresh_token_enc: "encrypted:refresh-token",
    token_expires_at: new Date(Date.now() + 3600000).toISOString(),
    ...overrides,
  };
  vi.mocked(getConnectionByPlatform).mockResolvedValue(connection as never);
  return connection;
}

describe("buildPublishText", () => {
  it("returns body alone when no tags", () => {
    expect(buildPublishText("Hello world!", [], 280)).toBe("Hello world!");
  });

  it("appends tags when they fit within limit", () => {
    expect(buildPublishText("Hello!", ["react", "nextjs"], 280)).toBe(
      "Hello! #react #nextjs",
    );
  });

  it("trims tags from the end when over limit", () => {
    const body = "a".repeat(270);
    // " #react" = 7 chars, total would be 277 — fits
    // " #nextjs" = 8 more = 285 — doesn't fit
    expect(buildPublishText(body, ["react", "nextjs"], 280)).toBe(
      body + " #react",
    );
  });

  it("drops all tags when body fills the limit", () => {
    const body = "a".repeat(280);
    expect(buildPublishText(body, ["react", "nextjs"], 280)).toBe(body);
  });

  it("handles body exactly at limit minus one tag", () => {
    // body = 273 chars, " #react" = 7 chars, total = 280 — fits exactly
    const body = "a".repeat(273);
    expect(buildPublishText(body, ["react"], 280)).toBe(body + " #react");
  });

  it("handles empty body", () => {
    expect(buildPublishText("", ["react"], 280)).toBe(" #react");
  });
});

describe("publishing service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("publishPost", () => {
    it("publishes to a single platform successfully", async () => {
      const { chain } = mockSupabase();
      const adapter = mockAdapter();
      mockConnection();

      // getPostById returns draft post
      chain.single.mockResolvedValueOnce({
        data: {
          id: TEST_POST_ID,
          user_id: TEST_USER_ID,
          body: "Hello world!",
          status: "draft",
          post_publications: [
            { id: "pub-1", platform: "twitter", status: "pending" },
          ],
        },
        error: null,
      });
      // upsert publication
      chain.single.mockResolvedValueOnce({ data: {}, error: null });
      // update post status
      chain.single.mockResolvedValueOnce({ data: {}, error: null });

      const results = await publishPost(TEST_USER_ID, TEST_POST_ID);

      expect(adapter.publishPost).toHaveBeenCalledWith("access-token", {
        text: "Hello world!",
      });
      expect(decrypt).toHaveBeenCalledWith("encrypted:access-token");
      expect(results).toHaveLength(1);
      expect(results[0].platform).toBe("twitter");
      expect(results[0].success).toBe(true);
    });

    it("publishes a scheduled post successfully", async () => {
      const { chain } = mockSupabase();
      const adapter = mockAdapter();
      mockConnection();

      chain.single.mockResolvedValueOnce({
        data: {
          id: TEST_POST_ID,
          user_id: TEST_USER_ID,
          body: "Scheduled tweet!",
          status: "scheduled",
          post_publications: [
            { id: "pub-1", platform: "twitter", status: "pending" },
          ],
        },
        error: null,
      });
      chain.single.mockResolvedValueOnce({ data: {}, error: null });
      chain.single.mockResolvedValueOnce({ data: {}, error: null });

      const results = await publishPost(TEST_USER_ID, TEST_POST_ID);

      expect(adapter.publishPost).toHaveBeenCalledWith("access-token", {
        text: "Scheduled tweet!",
      });
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
    });

    it("rejects publishing a post that is not draft or failed", async () => {
      const { chain } = mockSupabase();
      mockAdapter();

      chain.single.mockResolvedValueOnce({
        data: {
          id: TEST_POST_ID,
          status: "published",
          post_publications: [],
        },
        error: null,
      });

      await expect(
        publishPost(TEST_USER_ID, TEST_POST_ID),
      ).rejects.toThrow("Post must be in draft, scheduled, or failed status to publish");
    });

    it("rejects when post not found", async () => {
      const { chain } = mockSupabase();
      chain.single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });

      await expect(
        publishPost(TEST_USER_ID, TEST_POST_ID),
      ).rejects.toThrow("Post not found");
    });

    it("refreshes token when expired", async () => {
      const { chain } = mockSupabase();
      const adapter = mockAdapter();
      mockConnection({
        token_expires_at: new Date(Date.now() - 60000).toISOString(), // expired
      });

      chain.single.mockResolvedValueOnce({
        data: {
          id: TEST_POST_ID,
          body: "Hello!",
          status: "draft",
          post_publications: [
            { id: "pub-1", platform: "twitter", status: "pending" },
          ],
        },
        error: null,
      });
      chain.single.mockResolvedValueOnce({ data: {}, error: null });
      chain.single.mockResolvedValueOnce({ data: {}, error: null });

      await publishPost(TEST_USER_ID, TEST_POST_ID);

      expect(adapter.refreshTokens).toHaveBeenCalledWith("refresh-token");
      expect(updateTokens).toHaveBeenCalled();
      expect(adapter.publishPost).toHaveBeenCalledWith("new-access", {
        text: "Hello!",
      });
    });

    it("marks publication as failed when adapter throws", async () => {
      const { from, chain } = mockSupabase();
      mockAdapter({
        publishPost: vi.fn().mockRejectedValue(new Error("Rate limited")),
      });
      mockConnection();

      chain.single.mockResolvedValueOnce({
        data: {
          id: TEST_POST_ID,
          body: "Hello!",
          status: "draft",
          post_publications: [
            { id: "pub-1", platform: "twitter", status: "pending" },
          ],
        },
        error: null,
      });
      chain.single.mockResolvedValueOnce({ data: {}, error: null });
      chain.single.mockResolvedValueOnce({ data: {}, error: null });

      const results = await publishPost(TEST_USER_ID, TEST_POST_ID);

      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe("Rate limited");
      // Should still update post_publications with failure
      expect(from).toHaveBeenCalledWith("post_publications");
    });

    it("sets post status to published when all platforms succeed", async () => {
      const { chain } = mockSupabase();
      mockAdapter();
      mockConnection();

      chain.single.mockResolvedValueOnce({
        data: {
          id: TEST_POST_ID,
          body: "Hello!",
          status: "draft",
          post_publications: [
            { id: "pub-1", platform: "twitter", status: "pending" },
          ],
        },
        error: null,
      });
      chain.single.mockResolvedValueOnce({ data: {}, error: null });
      chain.single.mockResolvedValueOnce({ data: {}, error: null });

      await publishPost(TEST_USER_ID, TEST_POST_ID);

      // Check that post status was updated to 'published'
      const updateCalls = chain.update.mock.calls;
      const lastUpdate = updateCalls[updateCalls.length - 1][0];
      expect(lastUpdate.status).toBe("published");
      expect(lastUpdate.published_at).toBeDefined();
    });

    it("sets post status to failed when all platforms fail", async () => {
      const { chain } = mockSupabase();
      mockAdapter({
        publishPost: vi.fn().mockRejectedValue(new Error("API error")),
      });
      mockConnection();

      chain.single.mockResolvedValueOnce({
        data: {
          id: TEST_POST_ID,
          body: "Hello!",
          status: "draft",
          post_publications: [
            { id: "pub-1", platform: "twitter", status: "pending" },
          ],
        },
        error: null,
      });
      chain.single.mockResolvedValueOnce({ data: {}, error: null });
      chain.single.mockResolvedValueOnce({ data: {}, error: null });

      await publishPost(TEST_USER_ID, TEST_POST_ID);

      const updateCalls = chain.update.mock.calls;
      const lastUpdate = updateCalls[updateCalls.length - 1][0];
      expect(lastUpdate.status).toBe("failed");
    });

    it("marks connection expired when token refresh fails", async () => {
      const { chain } = mockSupabase();
      mockAdapter({
        refreshTokens: vi.fn().mockRejectedValue(new Error("Token revoked")),
      });
      mockConnection({
        token_expires_at: new Date(Date.now() - 60000).toISOString(),
      });

      chain.single.mockResolvedValueOnce({
        data: {
          id: TEST_POST_ID,
          body: "Hello!",
          status: "draft",
          post_publications: [
            { id: "pub-1", platform: "twitter", status: "pending" },
          ],
        },
        error: null,
      });
      chain.single.mockResolvedValueOnce({ data: {}, error: null });
      chain.single.mockResolvedValueOnce({ data: {}, error: null });

      const results = await publishPost(TEST_USER_ID, TEST_POST_ID);

      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain("Token revoked");
    });

    it("handles missing connection for a platform", async () => {
      const { chain } = mockSupabase();
      mockAdapter();
      vi.mocked(getConnectionByPlatform).mockResolvedValue(null);

      chain.single.mockResolvedValueOnce({
        data: {
          id: TEST_POST_ID,
          body: "Hello!",
          status: "draft",
          post_publications: [
            { id: "pub-1", platform: "twitter", status: "pending" },
          ],
        },
        error: null,
      });
      chain.single.mockResolvedValueOnce({ data: {}, error: null });
      chain.single.mockResolvedValueOnce({ data: {}, error: null });

      const results = await publishPost(TEST_USER_ID, TEST_POST_ID);

      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain("No active connection");
    });

    it("uploads media to Twitter and passes media_ids when post has media_urls", async () => {
      const { chain } = mockSupabase();
      const adapter = mockAdapter({
        publishPost: vi.fn().mockResolvedValue({
          platformPostId: "tw-post-123",
          platformUrl: "https://twitter.com/i/status/tw-post-123",
          publishedAt: new Date(),
        }),
        uploadMedia: vi.fn().mockResolvedValue("media-id-1"),
      });
      mockConnection();
      vi.mocked(downloadImage).mockResolvedValue(Buffer.from("image-data"));
      vi.mocked(deleteImage).mockResolvedValue(undefined);

      chain.single.mockResolvedValueOnce({
        data: {
          id: TEST_POST_ID,
          user_id: TEST_USER_ID,
          body: "Post with image!",
          status: "draft",
          media_urls: ["user-123/img1.jpg"],
          post_publications: [
            { id: "pub-1", platform: "twitter", status: "pending" },
          ],
        },
        error: null,
      });
      chain.single.mockResolvedValueOnce({ data: {}, error: null });
      chain.single.mockResolvedValueOnce({ data: {}, error: null });

      const results = await publishPost(TEST_USER_ID, TEST_POST_ID);

      expect(results[0].success).toBe(true);
      expect(downloadImage).toHaveBeenCalledWith("user-123/img1.jpg");
      expect(adapter.uploadMedia).toHaveBeenCalledWith(
        "access-token",
        expect.any(Buffer),
        "image/jpeg",
      );
      expect(adapter.publishPost).toHaveBeenCalledWith("access-token", {
        text: "Post with image!",
        mediaIds: ["media-id-1"],
      });
    });

    it("deletes media from storage after successful publish", async () => {
      const { chain } = mockSupabase();
      mockAdapter({
        publishPost: vi.fn().mockResolvedValue({
          platformPostId: "tw-post-123",
          platformUrl: "https://twitter.com/i/status/tw-post-123",
          publishedAt: new Date(),
        }),
        uploadMedia: vi.fn().mockResolvedValue("media-id-1"),
      });
      mockConnection();
      vi.mocked(downloadImage).mockResolvedValue(Buffer.from("image-data"));
      vi.mocked(deleteImage).mockResolvedValue(undefined);

      chain.single.mockResolvedValueOnce({
        data: {
          id: TEST_POST_ID,
          user_id: TEST_USER_ID,
          body: "Post with image!",
          status: "draft",
          media_urls: ["user-123/img1.jpg"],
          post_publications: [
            { id: "pub-1", platform: "twitter", status: "pending" },
          ],
        },
        error: null,
      });
      chain.single.mockResolvedValueOnce({ data: {}, error: null });
      chain.single.mockResolvedValueOnce({ data: {}, error: null });

      await publishPost(TEST_USER_ID, TEST_POST_ID);

      expect(deleteImage).toHaveBeenCalledWith("user-123/img1.jpg");
    });

    it("appends tags to tweet text when publishing", async () => {
      const { chain } = mockSupabase();
      const adapter = mockAdapter();
      mockConnection();

      chain.single.mockResolvedValueOnce({
        data: {
          id: TEST_POST_ID,
          user_id: TEST_USER_ID,
          body: "Hello world!",
          status: "draft",
          tags: ["react", "nextjs"],
          post_publications: [
            { id: "pub-1", platform: "twitter", status: "pending" },
          ],
        },
        error: null,
      });
      chain.single.mockResolvedValueOnce({ data: {}, error: null });
      chain.single.mockResolvedValueOnce({ data: {}, error: null });

      const results = await publishPost(TEST_USER_ID, TEST_POST_ID);

      expect(results[0].success).toBe(true);
      expect(adapter.publishPost).toHaveBeenCalledWith("access-token", {
        text: "Hello world! #react #nextjs",
      });
    });

    it("does not upload media when post has no media_urls", async () => {
      const { chain } = mockSupabase();
      const adapter = mockAdapter({
        publishPost: vi.fn().mockResolvedValue({
          platformPostId: "tw-post-123",
          platformUrl: "https://twitter.com/i/status/tw-post-123",
          publishedAt: new Date(),
        }),
        uploadMedia: vi.fn(),
      });
      mockConnection();

      chain.single.mockResolvedValueOnce({
        data: {
          id: TEST_POST_ID,
          user_id: TEST_USER_ID,
          body: "Text only!",
          status: "draft",
          media_urls: null,
          post_publications: [
            { id: "pub-1", platform: "twitter", status: "pending" },
          ],
        },
        error: null,
      });
      chain.single.mockResolvedValueOnce({ data: {}, error: null });
      chain.single.mockResolvedValueOnce({ data: {}, error: null });

      await publishPost(TEST_USER_ID, TEST_POST_ID);

      expect(adapter.uploadMedia).not.toHaveBeenCalled();
      expect(downloadImage).not.toHaveBeenCalled();
      expect(adapter.publishPost).toHaveBeenCalledWith("access-token", {
        text: "Text only!",
      });
    });
  });
});
