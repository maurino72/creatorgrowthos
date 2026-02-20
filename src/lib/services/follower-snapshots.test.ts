import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  insertFollowerSnapshot,
  getFollowerHistory,
  getLatestFollowerCount,
  getFollowerGrowth,
} from "./follower-snapshots";

// ─── Supabase Mock ──────────────────────────────────────────────────────

function createMockChain() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.upsert = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.gte = vi.fn().mockReturnValue(chain);
  chain.lte = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116", message: "Not found" } });
  chain.range = vi.fn().mockReturnValue(chain);
  return chain;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";

describe("follower-snapshots service", () => {
  let mockChain: ReturnType<typeof createMockChain>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockChain = createMockChain();
    vi.mocked(createAdminClient).mockReturnValue(mockChain as never);
  });

  // ─── insertFollowerSnapshot ─────────────────────────────────────────

  describe("insertFollowerSnapshot", () => {
    it("upserts a snapshot into follower_snapshots table", async () => {
      const data = {
        userId: "user-1",
        platform: "twitter" as const,
        followerCount: 12500,
        newFollowers: 15,
        snapshotDate: "2025-01-15",
      };

      mockChain.single.mockResolvedValueOnce({
        data: { id: "fs-1", ...data },
        error: null,
      });

      await insertFollowerSnapshot(data);

      expect(mockChain.from).toHaveBeenCalledWith("follower_snapshots");
      expect(mockChain.upsert).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            user_id: "user-1",
            platform: "twitter",
            follower_count: 12500,
            new_followers: 15,
            snapshot_date: "2025-01-15",
          }),
        ],
        expect.objectContaining({
          onConflict: "user_id,platform,snapshot_date",
        }),
      );
    });

    it("throws on upsert error", async () => {
      mockChain.single.mockResolvedValueOnce({
        data: null,
        error: { message: "DB error", code: "50000" },
      });

      await expect(
        insertFollowerSnapshot({
          userId: "user-1",
          platform: "twitter",
          followerCount: 100,
          snapshotDate: "2025-01-15",
        }),
      ).rejects.toThrow("DB error");
    });
  });

  // ─── getFollowerHistory ─────────────────────────────────────────────

  describe("getFollowerHistory", () => {
    it("returns snapshots ordered by date ascending for charts", async () => {
      const snapshots = [
        { id: "fs-1", follower_count: 100, snapshot_date: "2025-01-01" },
        { id: "fs-2", follower_count: 115, snapshot_date: "2025-01-02" },
      ];
      mockChain.order.mockResolvedValueOnce({ data: snapshots, error: null });

      const result = await getFollowerHistory("user-1", "twitter", 30);

      expect(mockChain.from).toHaveBeenCalledWith("follower_snapshots");
      expect(mockChain.eq).toHaveBeenCalledWith("user_id", "user-1");
      expect(mockChain.eq).toHaveBeenCalledWith("platform", "twitter");
      expect(mockChain.order).toHaveBeenCalledWith("snapshot_date", { ascending: true });
      expect(result).toEqual(snapshots);
    });

    it("filters by date range based on days parameter", async () => {
      mockChain.order.mockResolvedValueOnce({ data: [], error: null });

      await getFollowerHistory("user-1", "linkedin", 7);

      expect(mockChain.gte).toHaveBeenCalledWith("snapshot_date", expect.any(String));
    });
  });

  // ─── getLatestFollowerCount ─────────────────────────────────────────

  describe("getLatestFollowerCount", () => {
    it("returns the most recent follower count", async () => {
      mockChain.single.mockResolvedValueOnce({
        data: { follower_count: 4500, snapshot_date: "2025-01-15" },
        error: null,
      });

      const result = await getLatestFollowerCount("user-1", "linkedin");

      expect(mockChain.order).toHaveBeenCalledWith("snapshot_date", { ascending: false });
      expect(mockChain.limit).toHaveBeenCalledWith(1);
      expect(result).toEqual({ follower_count: 4500, snapshot_date: "2025-01-15" });
    });

    it("returns null when no snapshots exist", async () => {
      mockChain.single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });

      const result = await getLatestFollowerCount("user-1", "twitter");
      expect(result).toBeNull();
    });
  });

  // ─── getFollowerGrowth ──────────────────────────────────────────────

  describe("getFollowerGrowth", () => {
    it("calculates net growth from first and last snapshots in period", async () => {
      const snapshots = [
        { follower_count: 4320, new_followers: 5, snapshot_date: "2025-01-01" },
        { follower_count: 4340, new_followers: 8, snapshot_date: "2025-01-10" },
        { follower_count: 4500, new_followers: 12, snapshot_date: "2025-01-30" },
      ];
      mockChain.order.mockResolvedValueOnce({ data: snapshots, error: null });

      const result = await getFollowerGrowth("user-1", "linkedin", 30);

      expect(result.currentCount).toBe(4500);
      expect(result.startCount).toBe(4320);
      expect(result.netGrowth).toBe(180);
      expect(result.growthRate).toBeCloseTo(4.17, 1);
      expect(result.daily).toEqual(snapshots);
    });

    it("returns zeros when no snapshots exist", async () => {
      mockChain.order.mockResolvedValueOnce({ data: [], error: null });

      const result = await getFollowerGrowth("user-1", "twitter", 30);

      expect(result.currentCount).toBe(0);
      expect(result.startCount).toBe(0);
      expect(result.netGrowth).toBe(0);
      expect(result.growthRate).toBe(0);
      expect(result.daily).toEqual([]);
    });

    it("handles single snapshot (no growth)", async () => {
      mockChain.order.mockResolvedValueOnce({
        data: [{ follower_count: 100, new_followers: 0, snapshot_date: "2025-01-15" }],
        error: null,
      });

      const result = await getFollowerGrowth("user-1", "twitter", 30);

      expect(result.currentCount).toBe(100);
      expect(result.startCount).toBe(100);
      expect(result.netGrowth).toBe(0);
      expect(result.growthRate).toBe(0);
    });
  });
});
