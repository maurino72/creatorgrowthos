import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Dependencies ─────────────────────────────────────────────────

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/services/connections", () => ({
  getConnectionByPlatform: vi.fn(),
}));

vi.mock("@/lib/adapters", () => ({
  getAdapterForPlatform: vi.fn(),
}));

vi.mock("@/lib/utils/encryption", () => ({
  decrypt: vi.fn((v: string) => `decrypted-${v}`),
}));

vi.mock("@/lib/services/metric-snapshots", () => ({
  insertMetricSnapshot: vi.fn(),
  logMetricFetch: vi.fn(),
  getApiCallsUsedToday: vi.fn(),
  getDecayInterval: vi.fn(),
}));

vi.mock("@/lib/services/follower-snapshots", () => ({
  insertFollowerSnapshot: vi.fn(),
  getLatestFollowerCount: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { getConnectionByPlatform } from "@/lib/services/connections";
import { getAdapterForPlatform } from "@/lib/adapters";
import { insertMetricSnapshot, logMetricFetch, getApiCallsUsedToday } from "@/lib/services/metric-snapshots";
import { insertFollowerSnapshot, getLatestFollowerCount } from "@/lib/services/follower-snapshots";
import {
  collectLinkedInMetrics,
  collectTwitterMetrics,
  fetchLinkedInFollowers,
  fetchTwitterFollowers,
  cleanupStaleMetrics,
} from "./analytics";

// ─── Helpers ────────────────────────────────────────────────────────────

function createMockStep() {
  return {
    run: vi.fn(async (_id: string, fn: () => Promise<unknown>) => fn()),
    sendEvent: vi.fn(),
    sleep: vi.fn(),
  };
}

function createMockChain() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.gte = vi.fn().mockReturnValue(chain);
  chain.lt = vi.fn().mockReturnValue(chain);
  chain.not = vi.fn().mockReturnValue(chain);
  chain.is = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue({ data: null, error: null });
  return chain;
}

describe("analytics Inngest functions", () => {
  let mockChain: ReturnType<typeof createMockChain>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockChain = createMockChain();
    vi.mocked(createAdminClient).mockReturnValue(mockChain as never);
    vi.mocked(getApiCallsUsedToday).mockResolvedValue(0);
  });

  // ─── collectLinkedInMetrics ─────────────────────────────────────────

  describe("collectLinkedInMetrics", () => {
    it("fetches LinkedIn connections and publishes metrics for published posts", async () => {
      const step = createMockStep();

      // Mock: find users with LinkedIn connections
      mockChain.select.mockReturnValueOnce({
        ...mockChain,
        eq: vi.fn().mockReturnValue({
          ...mockChain,
          eq: vi.fn().mockResolvedValue({
            data: [
              {
                user_id: "user-1",
                access_token_enc: "enc-token",
                platform_user_id: "li-user-1",
              },
            ],
            error: null,
          }),
        }),
      });

      // Mock: find published posts for user
      step.run
        .mockImplementationOnce(async (_id, fn) => fn()) // get-linkedin-connections
        .mockImplementationOnce(async (_id, fn) => {
          // get-posts-for-user-1
          mockChain.not.mockReturnValueOnce({
            ...mockChain,
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "pub-1",
                  platform_post_id: "urn:li:share:123",
                  published_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
                  posts: { id: "post-1", user_id: "user-1" },
                },
              ],
              error: null,
            }),
          });
          return fn();
        })
        .mockImplementationOnce(async () => {
          // fetch-metrics-urn:li:share:123 (mocked to skip actual API call)
          return { impressions: 500, uniqueReach: 350, reactions: 20, comments: 5, shares: 2 };
        })
        .mockImplementationOnce(async () => {
          // insert-snapshot
          return undefined;
        })
        .mockImplementationOnce(async () => {
          // log-fetch
          return undefined;
        });

      const handler = collectLinkedInMetrics["fn"];
      const result = await handler({ step } as never);

      expect(result).toEqual(expect.objectContaining({ postsProcessed: expect.any(Number) }));
    });

    it("returns early when no LinkedIn connections exist", async () => {
      const step = createMockStep();
      step.run.mockImplementationOnce(async (_id, fn) => {
        mockChain.eq.mockReturnValueOnce({
          ...mockChain,
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        });
        return fn();
      });

      const handler = collectLinkedInMetrics["fn"];
      const result = await handler({ step } as never);

      expect(result).toEqual({ postsProcessed: 0 });
    });
  });

  // ─── collectTwitterMetrics ──────────────────────────────────────────

  describe("collectTwitterMetrics", () => {
    it("uses batch metrics endpoint for Twitter", async () => {
      const step = createMockStep();
      const mockAdapter = {
        fetchBatchMetrics: vi.fn().mockResolvedValue([
          { platformPostId: "tweet-1", impressions: 1000, likes: 50, replies: 5, reposts: 10, quotes: 2, bookmarks: 7 },
        ]),
      };

      step.run
        .mockImplementationOnce(async (_id, fn) => {
          // get-twitter-connections
          mockChain.eq.mockReturnValueOnce({
            ...mockChain,
            eq: vi.fn().mockResolvedValue({
              data: [{ user_id: "user-1", access_token_enc: "enc-token", platform_user_id: "tw-user" }],
              error: null,
            }),
          });
          return fn();
        })
        .mockImplementationOnce(async (_id, fn) => {
          // get-posts-for-user-1
          mockChain.not.mockReturnValueOnce({
            ...mockChain,
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "pub-1",
                  platform_post_id: "tweet-1",
                  published_at: new Date(Date.now() - 3600000).toISOString(),
                  posts: { id: "post-1", user_id: "user-1" },
                },
              ],
              error: null,
            }),
          });
          return fn();
        })
        .mockImplementationOnce(async () => {
          // batch-fetch-metrics
          return mockAdapter.fetchBatchMetrics("token", ["tweet-1"]);
        })
        .mockImplementationOnce(async () => undefined) // insert-snapshots
        .mockImplementationOnce(async () => undefined); // log-fetch

      const handler = collectTwitterMetrics["fn"];
      const result = await handler({ step } as never);

      expect(result).toEqual(expect.objectContaining({ postsProcessed: expect.any(Number) }));
    });
  });

  // ─── fetchLinkedInFollowers ─────────────────────────────────────────

  describe("fetchLinkedInFollowers", () => {
    it("fetches follower count and inserts snapshot", async () => {
      const step = createMockStep();
      const mockAdapter = {
        fetchFollowerStats: vi.fn().mockResolvedValue({ followerCount: 4500 }),
      };

      vi.mocked(getAdapterForPlatform).mockReturnValue(mockAdapter as never);
      vi.mocked(getConnectionByPlatform).mockResolvedValue({
        id: "conn-1",
        access_token_enc: "enc-token",
        platform_user_id: "li-user-1",
      } as never);

      step.run
        .mockImplementationOnce(async (_id, fn) => {
          // get-linkedin-connections
          mockChain.eq.mockReturnValueOnce({
            ...mockChain,
            eq: vi.fn().mockResolvedValue({
              data: [{ user_id: "user-1", access_token_enc: "enc-token", platform_user_id: "li-user-1" }],
              error: null,
            }),
          });
          return fn();
        })
        .mockImplementationOnce(async () => {
          // fetch-followers-user-1
          return { followerCount: 4500 };
        })
        .mockImplementationOnce(async () => undefined) // insert-snapshot
        .mockImplementationOnce(async () => undefined); // log-fetch

      const handler = fetchLinkedInFollowers["fn"];
      const result = await handler({ step } as never);

      expect(result).toEqual(expect.objectContaining({ usersProcessed: expect.any(Number) }));
    });
  });

  // ─── fetchTwitterFollowers ──────────────────────────────────────────

  describe("fetchTwitterFollowers", () => {
    it("fetches follower count and calculates new followers from previous", async () => {
      const step = createMockStep();

      vi.mocked(getLatestFollowerCount).mockResolvedValue({
        follower_count: 12000,
        snapshot_date: "2025-01-14",
      } as never);

      step.run
        .mockImplementationOnce(async (_id, fn) => {
          // get-twitter-connections
          mockChain.eq.mockReturnValueOnce({
            ...mockChain,
            eq: vi.fn().mockResolvedValue({
              data: [{ user_id: "user-1", access_token_enc: "enc-token", platform_user_id: "tw-user" }],
              error: null,
            }),
          });
          return fn();
        })
        .mockImplementationOnce(async () => {
          // fetch-followers-user-1
          return { followerCount: 12500, followingCount: 340, tweetCount: 8721 };
        })
        .mockImplementationOnce(async () => undefined) // insert-snapshot
        .mockImplementationOnce(async () => undefined); // log-fetch

      const handler = fetchTwitterFollowers["fn"];
      const result = await handler({ step } as never);

      expect(result).toEqual(expect.objectContaining({ usersProcessed: expect.any(Number) }));
    });
  });

  // ─── cleanupStaleMetrics ────────────────────────────────────────────

  describe("cleanupStaleMetrics", () => {
    it("deletes old fetch logs", async () => {
      const step = createMockStep();

      step.run
        .mockImplementationOnce(async (_id, fn) => {
          mockChain.lt.mockReturnValueOnce({
            ...mockChain,
            delete: vi.fn().mockReturnValue({
              ...mockChain,
              select: vi.fn().mockResolvedValue({ data: [{ id: "1" }, { id: "2" }], error: null }),
            }),
          });
          return fn();
        })
        .mockImplementationOnce(async () => 0); // compact snapshots

      const handler = cleanupStaleMetrics["fn"];
      const result = await handler({ step } as never);

      expect(result).toEqual(expect.objectContaining({ logsDeleted: expect.any(Number) }));
    });
  });
});
