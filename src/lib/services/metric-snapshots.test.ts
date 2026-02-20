import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  insertMetricSnapshot,
  getLatestSnapshotForPost,
  getSnapshotsForPost,
  getLatestSnapshotsBatch,
  logMetricFetch,
  getApiCallsUsedToday,
  getDecayInterval,
} from "./metric-snapshots";

// ─── Supabase Mock ──────────────────────────────────────────────────────

function createMockChain() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.gte = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116", message: "Not found" } });
  return chain;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";

describe("metric-snapshots service", () => {
  let mockChain: ReturnType<typeof createMockChain>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockChain = createMockChain();
    vi.mocked(createAdminClient).mockReturnValue(mockChain as never);
  });

  // ─── insertMetricSnapshot ─────────────────────────────────────────

  describe("insertMetricSnapshot", () => {
    it("inserts a snapshot into metric_snapshots table", async () => {
      const snapshot = {
        userId: "user-1",
        platform: "twitter" as const,
        postId: "post-1",
        platformPostId: "tweet-123",
        impressions: 5000,
        reactions: 89,
        comments: 12,
        shares: 7,
      };

      const inserted = { id: "snap-1", ...snapshot };
      mockChain.single.mockResolvedValueOnce({ data: inserted, error: null });

      const result = await insertMetricSnapshot(snapshot);

      expect(mockChain.from).toHaveBeenCalledWith("metric_snapshots");
      expect(mockChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-1",
          platform: "twitter",
          post_id: "post-1",
          platform_post_id: "tweet-123",
          impressions: 5000,
          reactions: 89,
          comments: 12,
          shares: 7,
        }),
      );
      expect(result).toEqual(inserted);
    });

    it("throws on insert error", async () => {
      mockChain.single.mockResolvedValueOnce({
        data: null,
        error: { message: "duplicate key", code: "23505" },
      });

      await expect(
        insertMetricSnapshot({
          userId: "user-1",
          platform: "twitter",
          platformPostId: "tweet-123",
        }),
      ).rejects.toThrow("duplicate key");
    });
  });

  // ─── getLatestSnapshotForPost ─────────────────────────────────────

  describe("getLatestSnapshotForPost", () => {
    it("queries by platform_post_id ordered by fetched_at desc, limit 1", async () => {
      const snapshot = {
        id: "snap-1",
        impressions: 5000,
        reactions: 89,
        fetched_at: "2025-01-15T12:00:00Z",
      };
      mockChain.single.mockResolvedValueOnce({ data: snapshot, error: null });

      const result = await getLatestSnapshotForPost("user-1", "tweet-123", "twitter");

      expect(mockChain.from).toHaveBeenCalledWith("metric_snapshots");
      expect(mockChain.eq).toHaveBeenCalledWith("user_id", "user-1");
      expect(mockChain.eq).toHaveBeenCalledWith("platform_post_id", "tweet-123");
      expect(mockChain.eq).toHaveBeenCalledWith("platform", "twitter");
      expect(mockChain.order).toHaveBeenCalledWith("fetched_at", { ascending: false });
      expect(result).toEqual(snapshot);
    });

    it("returns null when no snapshot found", async () => {
      mockChain.single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });

      const result = await getLatestSnapshotForPost("user-1", "tweet-999", "twitter");
      expect(result).toBeNull();
    });
  });

  // ─── getSnapshotsForPost ──────────────────────────────────────────

  describe("getSnapshotsForPost", () => {
    it("returns time-series snapshots ordered ascending for charts", async () => {
      const snapshots = [
        { id: "snap-1", impressions: 100, fetched_at: "2025-01-15T12:00:00Z" },
        { id: "snap-2", impressions: 500, fetched_at: "2025-01-15T18:00:00Z" },
      ];
      mockChain.limit.mockResolvedValueOnce({ data: snapshots, error: null });

      const result = await getSnapshotsForPost("user-1", "tweet-123", "twitter");

      expect(mockChain.order).toHaveBeenCalledWith("fetched_at", { ascending: true });
      expect(result).toEqual(snapshots);
    });

    it("supports limit parameter", async () => {
      mockChain.limit.mockResolvedValueOnce({ data: [], error: null });

      await getSnapshotsForPost("user-1", "tweet-123", "twitter", { limit: 10 });

      expect(mockChain.limit).toHaveBeenCalledWith(10);
    });

    it("supports since parameter", async () => {
      mockChain.limit.mockResolvedValueOnce({ data: [], error: null });

      await getSnapshotsForPost("user-1", "tweet-123", "twitter", {
        since: "2025-01-01T00:00:00Z",
      });

      expect(mockChain.gte).toHaveBeenCalledWith("fetched_at", "2025-01-01T00:00:00Z");
    });
  });

  // ─── getLatestSnapshotsBatch ──────────────────────────────────────

  describe("getLatestSnapshotsBatch", () => {
    it("returns empty object for empty platform_post_ids", async () => {
      const result = await getLatestSnapshotsBatch("user-1", []);
      expect(result).toEqual({});
    });

    it("groups latest snapshots by platform_post_id", async () => {
      const snapshots = [
        { id: "snap-2", platform_post_id: "tweet-1", impressions: 500, fetched_at: "2025-01-15T18:00:00Z" },
        { id: "snap-1", platform_post_id: "tweet-1", impressions: 100, fetched_at: "2025-01-15T12:00:00Z" },
        { id: "snap-3", platform_post_id: "tweet-2", impressions: 300, fetched_at: "2025-01-15T16:00:00Z" },
      ];
      mockChain.order.mockResolvedValueOnce({ data: snapshots, error: null });

      const result = await getLatestSnapshotsBatch("user-1", ["tweet-1", "tweet-2"]);

      // Should keep only the latest per platform_post_id
      expect(result["tweet-1"].id).toBe("snap-2");
      expect(result["tweet-2"].id).toBe("snap-3");
    });
  });

  // ─── logMetricFetch ───────────────────────────────────────────────

  describe("logMetricFetch", () => {
    it("inserts a log entry into metric_fetch_log", async () => {
      mockChain.single.mockResolvedValueOnce({ data: { id: "log-1" }, error: null });

      await logMetricFetch({
        userId: "user-1",
        platform: "linkedin",
        fetchType: "post_metrics",
        status: "success",
        apiCallsUsed: 5,
      });

      expect(mockChain.from).toHaveBeenCalledWith("metric_fetch_log");
      expect(mockChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-1",
          platform: "linkedin",
          fetch_type: "post_metrics",
          status: "success",
          api_calls_used: 5,
        }),
      );
    });

    it("includes platform_post_id when provided", async () => {
      mockChain.single.mockResolvedValueOnce({ data: { id: "log-1" }, error: null });

      await logMetricFetch({
        userId: "user-1",
        platform: "twitter",
        platformPostId: "tweet-123",
        fetchType: "post_metrics",
        status: "success",
        apiCallsUsed: 1,
      });

      expect(mockChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          platform_post_id: "tweet-123",
        }),
      );
    });

    it("includes error_message on failure", async () => {
      mockChain.single.mockResolvedValueOnce({ data: { id: "log-1" }, error: null });

      await logMetricFetch({
        userId: "user-1",
        platform: "linkedin",
        fetchType: "post_metrics",
        status: "failed",
        errorMessage: "Rate limited",
        apiCallsUsed: 0,
      });

      expect(mockChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "failed",
          error_message: "Rate limited",
        }),
      );
    });
  });

  // ─── getApiCallsUsedToday ─────────────────────────────────────────

  describe("getApiCallsUsedToday", () => {
    it("sums api_calls_used for today's fetch logs", async () => {
      mockChain.gte.mockResolvedValueOnce({
        data: [
          { api_calls_used: 10 },
          { api_calls_used: 15 },
          { api_calls_used: 17 },
        ],
        error: null,
      });

      const result = await getApiCallsUsedToday("user-1", "linkedin");

      expect(mockChain.from).toHaveBeenCalledWith("metric_fetch_log");
      expect(mockChain.eq).toHaveBeenCalledWith("user_id", "user-1");
      expect(mockChain.eq).toHaveBeenCalledWith("platform", "linkedin");
      expect(result).toBe(42);
    });

    it("returns 0 when no logs exist", async () => {
      mockChain.gte.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await getApiCallsUsedToday("user-1", "linkedin");
      expect(result).toBe(0);
    });
  });

  // ─── getDecayInterval ─────────────────────────────────────────────

  describe("getDecayInterval", () => {
    const MINUTE = 60 * 1000;
    const HOUR = 60 * MINUTE;
    const DAY = 24 * HOUR;

    it("returns 30min interval for LinkedIn posts < 2 hours old", () => {
      const publishedAt = new Date(Date.now() - 1 * HOUR);
      expect(getDecayInterval(publishedAt, "linkedin")).toBe(30 * MINUTE);
    });

    it("returns 15min interval for Twitter posts < 2 hours old", () => {
      const publishedAt = new Date(Date.now() - 1 * HOUR);
      expect(getDecayInterval(publishedAt, "twitter")).toBe(15 * MINUTE);
    });

    it("returns 1h for LinkedIn posts 2-6h old", () => {
      const publishedAt = new Date(Date.now() - 4 * HOUR);
      expect(getDecayInterval(publishedAt, "linkedin")).toBe(1 * HOUR);
    });

    it("returns 30min for Twitter posts 2-6h old", () => {
      const publishedAt = new Date(Date.now() - 4 * HOUR);
      expect(getDecayInterval(publishedAt, "twitter")).toBe(30 * MINUTE);
    });

    it("returns 3h for LinkedIn posts 6-24h old", () => {
      const publishedAt = new Date(Date.now() - 12 * HOUR);
      expect(getDecayInterval(publishedAt, "linkedin")).toBe(3 * HOUR);
    });

    it("returns 1h for Twitter posts 6-24h old", () => {
      const publishedAt = new Date(Date.now() - 12 * HOUR);
      expect(getDecayInterval(publishedAt, "twitter")).toBe(1 * HOUR);
    });

    it("returns 12h for LinkedIn posts 1-3 days old", () => {
      const publishedAt = new Date(Date.now() - 2 * DAY);
      expect(getDecayInterval(publishedAt, "linkedin")).toBe(12 * HOUR);
    });

    it("returns 6h for Twitter posts 1-3 days old", () => {
      const publishedAt = new Date(Date.now() - 2 * DAY);
      expect(getDecayInterval(publishedAt, "twitter")).toBe(6 * HOUR);
    });

    it("returns daily for LinkedIn posts 3-7 days old", () => {
      const publishedAt = new Date(Date.now() - 5 * DAY);
      expect(getDecayInterval(publishedAt, "linkedin")).toBe(1 * DAY);
    });

    it("returns 12h for Twitter posts 3-7 days old", () => {
      const publishedAt = new Date(Date.now() - 5 * DAY);
      expect(getDecayInterval(publishedAt, "twitter")).toBe(12 * HOUR);
    });

    it("returns 3 days for LinkedIn posts 7-30 days old", () => {
      const publishedAt = new Date(Date.now() - 14 * DAY);
      expect(getDecayInterval(publishedAt, "linkedin")).toBe(3 * DAY);
    });

    it("returns daily for Twitter posts 7-30 days old", () => {
      const publishedAt = new Date(Date.now() - 14 * DAY);
      expect(getDecayInterval(publishedAt, "twitter")).toBe(1 * DAY);
    });

    it("returns weekly for LinkedIn posts 30-90 days old", () => {
      const publishedAt = new Date(Date.now() - 60 * DAY);
      expect(getDecayInterval(publishedAt, "linkedin")).toBe(7 * DAY);
    });

    it("returns 3 days for Twitter posts 30-90 days old", () => {
      const publishedAt = new Date(Date.now() - 60 * DAY);
      expect(getDecayInterval(publishedAt, "twitter")).toBe(3 * DAY);
    });

    it("returns null for LinkedIn posts > 90 days old (stop polling)", () => {
      const publishedAt = new Date(Date.now() - 100 * DAY);
      expect(getDecayInterval(publishedAt, "linkedin")).toBeNull();
    });

    it("returns weekly for Twitter posts 90+ days old", () => {
      const publishedAt = new Date(Date.now() - 100 * DAY);
      expect(getDecayInterval(publishedAt, "twitter")).toBe(7 * DAY);
    });
  });
});
