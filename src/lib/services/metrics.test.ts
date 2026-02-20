import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import {
  insertMetricEvent,
  getMetricsForPost,
  getLatestMetricsForPost,
  getLatestMetricsBatch,
  getDashboardMetrics,
  getMetricsTimeSeries,
  getTopPosts,
  getPostsNeedingMetricUpdates,
  getPublicationsDueForMetrics,
  getMetricsFetchInterval,
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

  describe("getLatestMetricsBatch", () => {
    it("fetches latest metrics for multiple post IDs in a single query", async () => {
      const { from, chain } = mockSupabase();
      const mockData = [
        { id: "event-1", impressions: 1000, post_publication_id: "pub-1", observed_at: "2024-01-02T00:00:00Z", post_publications: { post_id: "post-1", platform: "twitter" } },
        { id: "event-2", impressions: 500, post_publication_id: "pub-2", observed_at: "2024-01-02T00:00:00Z", post_publications: { post_id: "post-2", platform: "twitter" } },
      ];
      chain.order.mockResolvedValue({ data: mockData, error: null });

      const result = await getLatestMetricsBatch(TEST_USER_ID, ["post-1", "post-2"]);

      expect(from).toHaveBeenCalledWith("metric_events");
      expect(chain.in).toHaveBeenCalledWith("post_publications.post_id", ["post-1", "post-2"]);
      expect(result["post-1"]).toHaveLength(1);
      expect(result["post-2"]).toHaveLength(1);
    });

    it("returns empty object when no post IDs provided", async () => {
      const result = await getLatestMetricsBatch(TEST_USER_ID, []);
      expect(result).toEqual({});
    });

    it("deduplicates keeping only the latest per publication per post", async () => {
      const { chain } = mockSupabase();
      const mockData = [
        { id: "event-1", impressions: 1500, post_publication_id: "pub-1", observed_at: "2024-01-03T00:00:00Z", post_publications: { post_id: "post-1", platform: "twitter" } },
        { id: "event-2", impressions: 1000, post_publication_id: "pub-1", observed_at: "2024-01-02T00:00:00Z", post_publications: { post_id: "post-1", platform: "twitter" } },
      ];
      chain.order.mockResolvedValue({ data: mockData, error: null });

      const result = await getLatestMetricsBatch(TEST_USER_ID, ["post-1"]);

      // Only the latest (event-1) should be kept
      expect(result["post-1"]).toHaveLength(1);
      expect(result["post-1"][0].id).toBe("event-1");
    });

    it("throws on query error", async () => {
      const { chain } = mockSupabase();
      chain.order.mockResolvedValue({
        data: null,
        error: { message: "Query failed" },
      });

      await expect(
        getLatestMetricsBatch(TEST_USER_ID, ["post-1"]),
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

    it("filters by platform when provided", async () => {
      const { chain } = mockSupabase();
      chain.order.mockResolvedValue({ data: [], error: null });

      await getDashboardMetrics(TEST_USER_ID, 7, "twitter");

      expect(chain.eq).toHaveBeenCalledWith("post_publications.platform", "twitter");
    });

    it("does not filter platform when not provided", async () => {
      const { chain } = mockSupabase();
      chain.order.mockResolvedValue({ data: [], error: null });

      await getDashboardMetrics(TEST_USER_ID, 7);

      expect(chain.eq).not.toHaveBeenCalledWith("post_publications.platform", expect.anything());
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

  describe("getMetricsTimeSeries", () => {
    it("returns daily aggregated metrics grouped by date", async () => {
      const { from, chain } = mockSupabase();
      const mockData = [
        {
          post_publication_id: "pub-1",
          impressions: 100,
          likes: 10,
          replies: 3,
          reposts: 5,
          engagement_rate: 0.18,
          observed_at: "2025-01-15T10:00:00Z",
          post_publications: { published_at: "2025-01-14T08:00:00Z" },
        },
        {
          post_publication_id: "pub-2",
          impressions: 200,
          likes: 20,
          replies: 7,
          reposts: 10,
          engagement_rate: 0.185,
          observed_at: "2025-01-15T14:00:00Z",
          post_publications: { published_at: "2025-01-14T08:00:00Z" },
        },
        {
          post_publication_id: "pub-1",
          impressions: 50,
          likes: 5,
          replies: 1,
          reposts: 2,
          engagement_rate: 0.16,
          observed_at: "2025-01-16T10:00:00Z",
          post_publications: { published_at: "2025-01-14T08:00:00Z" },
        },
      ];
      chain.order.mockResolvedValue({ data: mockData, error: null });

      const result = await getMetricsTimeSeries(TEST_USER_ID, 7);

      expect(from).toHaveBeenCalledWith("metric_events");
      expect(result).toHaveLength(2);
      // First day: two events aggregated
      expect(result[0].date).toBe("2025-01-15");
      expect(result[0].impressions).toBe(300);
      expect(result[0].likes).toBe(30);
      expect(result[0].replies).toBe(10);
      expect(result[0].reposts).toBe(15);
      expect(result[0].engagement).toBe(55);
      // Second day: one event
      expect(result[1].date).toBe("2025-01-16");
      expect(result[1].impressions).toBe(50);
    });

    it("returns empty array when no data", async () => {
      const { chain } = mockSupabase();
      chain.order.mockResolvedValue({ data: [], error: null });

      const result = await getMetricsTimeSeries(TEST_USER_ID, 7);

      expect(result).toEqual([]);
    });

    it("filters by platform when provided", async () => {
      const { chain } = mockSupabase();
      chain.order.mockResolvedValue({ data: [], error: null });

      await getMetricsTimeSeries(TEST_USER_ID, 7, "twitter");

      expect(chain.eq).toHaveBeenCalledWith("post_publications.platform", "twitter");
    });

    it("throws on query error", async () => {
      const { chain } = mockSupabase();
      chain.order.mockResolvedValue({
        data: null,
        error: { message: "Query failed" },
      });

      await expect(
        getMetricsTimeSeries(TEST_USER_ID, 7),
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

    it("filters by platform when provided", async () => {
      const { chain } = mockSupabase();
      chain.limit.mockResolvedValue({ data: [], error: null });

      await getTopPosts(TEST_USER_ID, 7, 5, "twitter");

      expect(chain.eq).toHaveBeenCalledWith("post_publications.platform", "twitter");
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

  describe("getMetricsFetchInterval", () => {
    it("returns 15 min for posts < 8h old", () => {
      const publishedAt = new Date(Date.now() - 4 * 60 * 60 * 1000); // 4h ago
      expect(getMetricsFetchInterval(publishedAt)).toBe(15 * 60 * 1000);
    });

    it("returns 2h for posts 8-24h old", () => {
      const publishedAt = new Date(Date.now() - 12 * 60 * 60 * 1000); // 12h ago
      expect(getMetricsFetchInterval(publishedAt)).toBe(2 * 60 * 60 * 1000);
    });

    it("returns 6h for posts 1-3d old", () => {
      const publishedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2d ago
      expect(getMetricsFetchInterval(publishedAt)).toBe(6 * 60 * 60 * 1000);
    });

    it("returns 12h for posts 3-7d old", () => {
      const publishedAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5d ago
      expect(getMetricsFetchInterval(publishedAt)).toBe(12 * 60 * 60 * 1000);
    });

    it("returns 24h for posts 7-30d old", () => {
      const publishedAt = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000); // 14d ago
      expect(getMetricsFetchInterval(publishedAt)).toBe(24 * 60 * 60 * 1000);
    });

    it("returns null for posts > 30d old", () => {
      const publishedAt = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000); // 35d ago
      expect(getMetricsFetchInterval(publishedAt)).toBeNull();
    });
  });

  describe("getPublicationsDueForMetrics", () => {
    it("returns publications that have never been fetched", async () => {
      const { from, chain } = mockSupabase();
      const pubData = [
        {
          id: "pub-1",
          platform: "twitter",
          platform_post_id: "tw-123",
          published_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          posts: { id: "post-1", user_id: "user-1" },
        },
      ];
      // First query: publications
      chain.not.mockResolvedValueOnce({ data: pubData, error: null });
      // Second query: metric_events (empty — never fetched)
      chain.order.mockResolvedValueOnce({ data: [], error: null });

      const result = await getPublicationsDueForMetrics();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("pub-1");
    });

    it("skips publications fetched recently within their interval", async () => {
      const { chain } = mockSupabase();
      const pubData = [
        {
          id: "pub-1",
          platform: "twitter",
          platform_post_id: "tw-123",
          published_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2h ago → 15min interval
          posts: { id: "post-1", user_id: "user-1" },
        },
      ];
      const metricData = [
        {
          post_publication_id: "pub-1",
          observed_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5min ago
        },
      ];
      chain.not.mockResolvedValueOnce({ data: pubData, error: null });
      chain.order.mockResolvedValueOnce({ data: metricData, error: null });

      const result = await getPublicationsDueForMetrics();

      expect(result).toHaveLength(0);
    });

    it("includes publications where enough time has passed since last fetch", async () => {
      const { chain } = mockSupabase();
      const pubData = [
        {
          id: "pub-1",
          platform: "twitter",
          platform_post_id: "tw-123",
          published_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2h ago → 15min interval
          posts: { id: "post-1", user_id: "user-1" },
        },
      ];
      const metricData = [
        {
          post_publication_id: "pub-1",
          observed_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(), // 20min ago > 15min interval
        },
      ];
      chain.not.mockResolvedValueOnce({ data: pubData, error: null });
      chain.order.mockResolvedValueOnce({ data: metricData, error: null });

      const result = await getPublicationsDueForMetrics();

      expect(result).toHaveLength(1);
    });

    it("returns empty when no published publications exist", async () => {
      const { chain } = mockSupabase();
      chain.not.mockResolvedValueOnce({ data: [], error: null });

      const result = await getPublicationsDueForMetrics();

      expect(result).toEqual([]);
    });

    it("throws on query error", async () => {
      const { chain } = mockSupabase();
      chain.not.mockResolvedValueOnce({ data: null, error: { message: "DB error" } });

      await expect(getPublicationsDueForMetrics()).rejects.toThrow("DB error");
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
