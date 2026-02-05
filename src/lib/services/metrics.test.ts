import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import {
  insertMetricEvent,
  getMetricsForPost,
  getLatestMetricsForPost,
  getDashboardMetrics,
  getTopPosts,
  getPostsNeedingMetricUpdates,
} from "./metrics";

const TEST_USER_ID = "user-123";

function mockSupabase() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
  };

  for (const method of Object.keys(chain)) {
    chain[method].mockReturnValue(chain);
  }

  const rpc = vi.fn().mockReturnValue(chain);
  const from = vi.fn().mockReturnValue(chain);
  vi.mocked(createAdminClient).mockReturnValue({ from, rpc } as never);

  return { from, rpc, chain };
}

describe("metrics service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("insertMetricEvent", () => {
    it("inserts a metric event with computed derived metrics", async () => {
      const { from, chain } = mockSupabase();
      const mockEvent = { id: "event-1" };
      chain.single.mockResolvedValue({ data: mockEvent, error: null });

      const result = await insertMetricEvent({
        postPublicationId: "pub-1",
        userId: TEST_USER_ID,
        platform: "twitter",
        impressions: 1000,
        likes: 30,
        replies: 5,
        reposts: 10,
        clicks: 20,
        profileVisits: 8,
        publishedAt: new Date("2024-01-01T12:00:00Z"),
      });

      expect(from).toHaveBeenCalledWith("metric_events");
      const insertCall = chain.insert.mock.calls[0][0];
      expect(insertCall.post_publication_id).toBe("pub-1");
      expect(insertCall.user_id).toBe(TEST_USER_ID);
      expect(insertCall.platform).toBe("twitter");
      expect(insertCall.impressions).toBe(1000);
      expect(insertCall.likes).toBe(30);
      expect(insertCall.replies).toBe(5);
      expect(insertCall.reposts).toBe(10);
      expect(insertCall.clicks).toBe(20);
      expect(insertCall.profile_visits).toBe(8);
      expect(insertCall.source).toBe("api");
      expect(result).toEqual(mockEvent);
    });

    it("computes engagement_rate from impressions, likes, replies, reposts", async () => {
      const { chain } = mockSupabase();
      chain.single.mockResolvedValue({ data: { id: "event-1" }, error: null });

      await insertMetricEvent({
        postPublicationId: "pub-1",
        userId: TEST_USER_ID,
        platform: "twitter",
        impressions: 1000,
        likes: 30,
        replies: 5,
        reposts: 10,
        publishedAt: new Date("2024-01-01T12:00:00Z"),
      });

      const insertCall = chain.insert.mock.calls[0][0];
      // engagement_rate = (30 + 5 + 10) / 1000 = 0.045
      expect(insertCall.engagement_rate).toBeCloseTo(0.045);
    });

    it("sets engagement_rate to null when impressions is 0", async () => {
      const { chain } = mockSupabase();
      chain.single.mockResolvedValue({ data: { id: "event-1" }, error: null });

      await insertMetricEvent({
        postPublicationId: "pub-1",
        userId: TEST_USER_ID,
        platform: "twitter",
        impressions: 0,
        likes: 0,
        replies: 0,
        reposts: 0,
        publishedAt: new Date("2024-01-01T12:00:00Z"),
      });

      const insertCall = chain.insert.mock.calls[0][0];
      expect(insertCall.engagement_rate).toBeNull();
    });

    it("computes hours_since_publish from publishedAt", async () => {
      const { chain } = mockSupabase();
      chain.single.mockResolvedValue({ data: { id: "event-1" }, error: null });

      const publishedAt = new Date(Date.now() - 3 * 60 * 60 * 1000); // 3 hours ago
      await insertMetricEvent({
        postPublicationId: "pub-1",
        userId: TEST_USER_ID,
        platform: "twitter",
        impressions: 100,
        likes: 5,
        replies: 1,
        reposts: 2,
        publishedAt,
      });

      const insertCall = chain.insert.mock.calls[0][0];
      expect(insertCall.hours_since_publish).toBe(3);
    });

    it("throws on insert error", async () => {
      const { chain } = mockSupabase();
      chain.single.mockResolvedValue({
        data: null,
        error: { message: "Insert failed", code: "23505" },
      });

      await expect(
        insertMetricEvent({
          postPublicationId: "pub-1",
          userId: TEST_USER_ID,
          platform: "twitter",
          impressions: 100,
          likes: 5,
          replies: 1,
          reposts: 2,
          publishedAt: new Date(),
        }),
      ).rejects.toThrow("Insert failed");
    });
  });

  describe("getMetricsForPost", () => {
    it("queries metric_events filtered by post_publication_id via post_publications", async () => {
      const { from, chain } = mockSupabase();
      chain.limit.mockResolvedValue({
        data: [
          { id: "event-1", impressions: 500 },
          { id: "event-2", impressions: 1000 },
        ],
        error: null,
      });

      const result = await getMetricsForPost(TEST_USER_ID, "post-1");

      expect(from).toHaveBeenCalledWith("metric_events");
      expect(chain.eq).toHaveBeenCalledWith("user_id", TEST_USER_ID);
      expect(result).toHaveLength(2);
    });

    it("supports limit parameter", async () => {
      const { chain } = mockSupabase();
      chain.limit.mockResolvedValue({ data: [], error: null });

      await getMetricsForPost(TEST_USER_ID, "post-1", { limit: 10 });

      expect(chain.limit).toHaveBeenCalledWith(10);
    });

    it("supports since parameter for filtering by date", async () => {
      const { chain } = mockSupabase();
      chain.limit.mockResolvedValue({ data: [], error: null });

      const since = "2024-01-01T00:00:00Z";
      await getMetricsForPost(TEST_USER_ID, "post-1", { since });

      expect(chain.gte).toHaveBeenCalledWith("observed_at", since);
    });

    it("throws on query error", async () => {
      const { chain } = mockSupabase();
      chain.limit.mockResolvedValue({
        data: null,
        error: { message: "Query failed" },
      });

      await expect(
        getMetricsForPost(TEST_USER_ID, "post-1"),
      ).rejects.toThrow("Query failed");
    });
  });

  describe("getLatestMetricsForPost", () => {
    it("fetches most recent metric event for each publication of a post", async () => {
      const { from, chain } = mockSupabase();
      const mockData = [
        {
          id: "event-1",
          impressions: 1500,
          post_publication_id: "pub-1",
          observed_at: "2024-01-02T00:00:00Z",
        },
      ];
      chain.order.mockResolvedValue({ data: mockData, error: null });

      const result = await getLatestMetricsForPost(TEST_USER_ID, "post-1");

      expect(from).toHaveBeenCalledWith("metric_events");
      expect(result).toEqual(mockData);
    });

    it("throws on query error", async () => {
      const { chain } = mockSupabase();
      chain.order.mockResolvedValue({
        data: null,
        error: { message: "Query failed" },
      });

      await expect(
        getLatestMetricsForPost(TEST_USER_ID, "post-1"),
      ).rejects.toThrow("Query failed");
    });
  });

  describe("getDashboardMetrics", () => {
    it("returns aggregate metrics for the given period", async () => {
      const { from, chain } = mockSupabase();
      const mockData = [
        { post_publication_id: "pub-1", impressions: 1000, likes: 30, replies: 5, reposts: 10, engagement_rate: 0.045 },
        { post_publication_id: "pub-2", impressions: 2000, likes: 60, replies: 10, reposts: 20, engagement_rate: 0.045 },
      ];
      chain.order.mockResolvedValue({ data: mockData, error: null });

      const result = await getDashboardMetrics(TEST_USER_ID, 7);

      expect(from).toHaveBeenCalledWith("metric_events");
      expect(result.totalImpressions).toBe(3000);
      expect(result.totalLikes).toBe(90);
      expect(result.totalReplies).toBe(15);
      expect(result.totalReposts).toBe(30);
      expect(result.totalEngagement).toBe(135);
      expect(result.averageEngagementRate).toBeCloseTo(0.045);
      expect(result.postCount).toBe(2);
    });

    it("returns zeros when no metrics exist", async () => {
      const { chain } = mockSupabase();
      chain.order.mockResolvedValue({ data: [], error: null });

      const result = await getDashboardMetrics(TEST_USER_ID, 30);

      expect(result.totalImpressions).toBe(0);
      expect(result.totalEngagement).toBe(0);
      expect(result.averageEngagementRate).toBe(0);
      expect(result.postCount).toBe(0);
    });

    it("throws on query error", async () => {
      const { chain } = mockSupabase();
      chain.order.mockResolvedValue({
        data: null,
        error: { message: "Query failed" },
      });

      await expect(
        getDashboardMetrics(TEST_USER_ID, 7),
      ).rejects.toThrow("Query failed");
    });
  });

  describe("getTopPosts", () => {
    it("returns top posts ordered by engagement", async () => {
      const { from, chain } = mockSupabase();
      const mockData = [
        {
          post_publication_id: "pub-1",
          impressions: 5000,
          likes: 100,
          replies: 20,
          reposts: 30,
          engagement_rate: 0.03,
          post_publications: {
            post_id: "post-1",
            platform: "twitter",
            posts: { body: "Top post!", status: "published" },
          },
        },
      ];
      chain.limit.mockResolvedValue({ data: mockData, error: null });

      const result = await getTopPosts(TEST_USER_ID, 7, 5);

      expect(from).toHaveBeenCalledWith("metric_events");
      expect(chain.limit).toHaveBeenCalledWith(5);
      expect(result).toHaveLength(1);
    });

    it("throws on query error", async () => {
      const { chain } = mockSupabase();
      chain.limit.mockResolvedValue({
        data: null,
        error: { message: "Query failed" },
      });

      await expect(getTopPosts(TEST_USER_ID, 7, 5)).rejects.toThrow(
        "Query failed",
      );
    });
  });

  describe("getPostsNeedingMetricUpdates", () => {
    it("queries published posts with publications that need metric fetches", async () => {
      const { from, chain } = mockSupabase();
      const mockData = [
        {
          id: "pub-1",
          post_id: "post-1",
          platform: "twitter",
          platform_post_id: "tweet-123",
          published_at: new Date().toISOString(),
          posts: {
            user_id: TEST_USER_ID,
            published_at: new Date().toISOString(),
          },
        },
      ];
      chain.not.mockResolvedValue({ data: mockData, error: null });

      const result = await getPostsNeedingMetricUpdates();

      expect(from).toHaveBeenCalledWith("post_publications");
      expect(result).toHaveLength(1);
      expect(result[0].platform_post_id).toBe("tweet-123");
    });

    it("returns empty array when no posts need updates", async () => {
      const { chain } = mockSupabase();
      chain.not.mockResolvedValue({ data: [], error: null });

      const result = await getPostsNeedingMetricUpdates();

      expect(result).toEqual([]);
    });

    it("throws on query error", async () => {
      const { chain } = mockSupabase();
      chain.not.mockResolvedValue({
        data: null,
        error: { message: "Query failed" },
      });

      await expect(getPostsNeedingMetricUpdates()).rejects.toThrow(
        "Query failed",
      );
    });
  });
});
