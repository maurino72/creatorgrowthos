import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

// ─── Mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
    },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/services/metric-snapshots", () => ({
  getLatestSnapshotsBatch: vi.fn(),
}));

vi.mock("@/lib/services/follower-snapshots", () => ({
  getFollowerGrowth: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLatestSnapshotsBatch } from "@/lib/services/metric-snapshots";
import { getFollowerGrowth } from "@/lib/services/follower-snapshots";

// ─── Helpers ────────────────────────────────────────────────────────────

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/analytics/overview");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new Request(url.toString());
}

const linkedinPub = {
  id: "pub-1",
  platform: "linkedin",
  platform_post_id: "urn:li:share:123",
  published_at: "2025-01-15T12:00:00Z",
  posts: { id: "post-1", content_type: "text" },
};

const twitterPub = {
  id: "pub-2",
  platform: "twitter",
  platform_post_id: "tweet-456",
  published_at: "2025-01-14T09:00:00Z",
  posts: { id: "post-2", content_type: "image" },
};

const linkedinSnapshot = {
  platform_post_id: "urn:li:share:123",
  impressions: 5000,
  unique_reach: 3500,
  reactions: 100,
  comments: 20,
  shares: 10,
  quotes: null,
  bookmarks: null,
  video_plays: null,
  video_watch_time_ms: null,
  video_unique_viewers: null,
};

const twitterSnapshot = {
  platform_post_id: "tweet-456",
  impressions: 8000,
  unique_reach: null,
  reactions: 200,
  comments: 50,
  shares: 30,
  quotes: 10,
  bookmarks: 40,
  video_plays: null,
  video_watch_time_ms: null,
  video_unique_viewers: null,
};

function createMockChain() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.gte = vi.fn().mockReturnValue(chain);
  chain.not = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockResolvedValue({
    data: [linkedinPub, twitterPub],
    error: null,
  });
  return chain;
}

// ─── Tests ──────────────────────────────────────────────────────────────

describe("GET /api/analytics/overview", () => {
  let mockChain: ReturnType<typeof createMockChain>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockChain = createMockChain();
    vi.mocked(createAdminClient).mockReturnValue({ from: mockChain.from } as never);
    vi.mocked(getLatestSnapshotsBatch).mockResolvedValue({
      "urn:li:share:123": linkedinSnapshot,
      "tweet-456": twitterSnapshot,
    } as never);
    vi.mocked(getFollowerGrowth).mockResolvedValue({
      currentCount: 5000,
      startCount: 4800,
      netGrowth: 200,
      growthRate: 4.2,
      daily: [],
    });
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as never);

    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns overview with platform breakdowns", async () => {
    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.period).toBe("30d");
    expect(json.platforms.linkedin).toBeDefined();
    expect(json.platforms.twitter).toBeDefined();
  });

  it("returns combined totals", async () => {
    const res = await GET(makeRequest());
    const json = await res.json();

    expect(json.combined.total_posts).toBe(2);
    expect(json.combined.total_impressions).toBe(13000); // 5000 + 8000
  });

  it("calculates per-platform metrics", async () => {
    const res = await GET(makeRequest());
    const json = await res.json();

    const linkedin = json.platforms.linkedin;
    expect(linkedin.posts_count).toBe(1);
    expect(linkedin.total_impressions).toBe(5000);
    expect(linkedin.total_reactions).toBe(100);
  });

  it("respects period parameter", async () => {
    await GET(makeRequest({ period: "7d" }));
    expect(mockChain.gte).toHaveBeenCalledWith(
      "published_at",
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    );
  });

  it("includes follower growth data", async () => {
    const res = await GET(makeRequest());
    const json = await res.json();

    expect(json.platforms.linkedin.follower_count).toBe(5000);
    expect(json.platforms.linkedin.follower_growth).toBe(200);
  });

  it("filters by platform when param provided", async () => {
    await GET(makeRequest({ platform: "twitter" }));
    // Should call .eq("platform", "twitter") on the query chain
    expect(mockChain.eq).toHaveBeenCalledWith("platform", "twitter");
  });

  it("handles no publications gracefully", async () => {
    mockChain.order.mockResolvedValueOnce({ data: [], error: null });
    vi.mocked(getLatestSnapshotsBatch).mockResolvedValue({});

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(json.combined.total_posts).toBe(0);
    expect(json.combined.total_impressions).toBe(0);
  });
});
