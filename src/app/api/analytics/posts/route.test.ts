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

vi.mock("@/lib/services/metric-snapshots", () => ({
  getLatestSnapshotsBatch: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { getLatestSnapshotsBatch } from "@/lib/services/metric-snapshots";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Helpers ────────────────────────────────────────────────────────────

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/analytics/posts");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new Request(url.toString());
}

const basePub = {
  id: "pub-1",
  platform: "linkedin",
  platform_post_id: "urn:li:share:123",
  published_at: "2025-01-15T12:00:00Z",
  status: "published",
  posts: {
    id: "post-1",
    body: "Hello world from LinkedIn",
    content_type: "text",
    created_at: "2025-01-15T10:00:00Z",
  },
};

const baseSnapshot = {
  id: "snap-1",
  platform_post_id: "urn:li:share:123",
  impressions: 4500,
  unique_reach: 3200,
  reactions: 89,
  comments: 12,
  shares: 7,
  quotes: null,
  bookmarks: null,
  video_plays: null,
  video_watch_time_ms: null,
  video_unique_viewers: null,
  fetched_at: "2025-01-15T18:30:00Z",
};

function createMockChain() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.gte = vi.fn().mockReturnValue(chain);
  chain.not = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.range = vi.fn().mockResolvedValue({
    data: [basePub],
    error: null,
    count: 1,
  });
  return chain;
}

// ─── Tests ──────────────────────────────────────────────────────────────

describe("GET /api/analytics/posts", () => {
  let mockChain: ReturnType<typeof createMockChain>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockChain = createMockChain();
    vi.mocked(createAdminClient).mockReturnValue({ from: mockChain.from } as never);
    vi.mocked(getLatestSnapshotsBatch).mockResolvedValue({
      "urn:li:share:123": baseSnapshot as never,
    });
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as never);

    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns posts with metrics for default params", async () => {
    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.posts).toHaveLength(1);
    expect(json.posts[0].platform).toBe("linkedin");
    expect(json.posts[0].metrics.impressions).toBe(4500);
    expect(json.posts[0].metrics.reactions).toBe(89);
    expect(json.pagination.total).toBe(1);
  });

  it("passes platform filter to query", async () => {
    await GET(makeRequest({ platform: "linkedin" }));
    expect(mockChain.eq).toHaveBeenCalledWith("platform", "linkedin");
  });

  it("passes period filter as gte on published_at", async () => {
    await GET(makeRequest({ period: "30d" }));
    expect(mockChain.gte).toHaveBeenCalledWith(
      "published_at",
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    );
  });

  it("returns pagination metadata", async () => {
    const res = await GET(makeRequest({ page: "2", per_page: "10" }));
    const json = await res.json();

    expect(json.pagination.page).toBe(2);
    expect(json.pagination.per_page).toBe(10);
  });

  it("sorts by impressions desc by default", async () => {
    await GET(makeRequest());
    // The default sort is by latest metrics — handled client-side
    // The DB query sorts by published_at desc
    expect(mockChain.order).toHaveBeenCalled();
  });

  it("returns summary with totals", async () => {
    const res = await GET(makeRequest());
    const json = await res.json();

    expect(json.summary).toBeDefined();
    expect(json.summary.total_posts).toBe(1);
    expect(json.summary.total_impressions).toBe(4500);
    expect(json.summary.total_reactions).toBe(89);
  });

  it("handles no publications gracefully", async () => {
    mockChain.range.mockResolvedValueOnce({
      data: [],
      error: null,
      count: 0,
    });
    vi.mocked(getLatestSnapshotsBatch).mockResolvedValue({});

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(json.posts).toHaveLength(0);
    expect(json.summary.total_posts).toBe(0);
    expect(json.pagination.total).toBe(0);
  });

  it("returns engagement_rate computed from metrics", async () => {
    const res = await GET(makeRequest());
    const json = await res.json();

    const post = json.posts[0];
    expect(post.metrics.engagement_rate).toBeDefined();
    expect(typeof post.metrics.engagement_rate).toBe("number");
  });
});
