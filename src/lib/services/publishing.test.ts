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

import { createAdminClient } from "@/lib/supabase/admin";
import { getAdapterForPlatform } from "@/lib/adapters";
import {
  getConnectionByPlatform,
  updateTokens,
} from "@/lib/services/connections";
import { decrypt } from "@/lib/utils/encryption";
import { publishPost } from "./publishing";

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
      ).rejects.toThrow("Post must be in draft or failed status to publish");
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
  });
});
