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
  getSnapshotsForPost: vi.fn(),
  getLatestSnapshotForPost: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import {
  getSnapshotsForPost,
  getLatestSnapshotForPost,
} from "@/lib/services/metric-snapshots";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Helpers ────────────────────────────────────────────────────────────

type RouteContext = { params: Promise<{ id: string }> };

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/analytics/posts/pub-1");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new Request(url.toString());
}

function makeContext(id = "pub-1"): RouteContext {
  return { params: Promise.resolve({ id }) };
}

const basePub = {
  id: "pub-1",
  platform: "linkedin",
  platform_post_id: "urn:li:share:123",
  published_at: "2025-01-15T12:00:00Z",
  status: "published",
  posts: {
    id: "post-1",
    body: "Hello world",
    content_type: "text",
    tags: [],
    created_at: "2025-01-15T10:00:00Z",
  },
};

const snapshots = [
  {
    id: "snap-1",
    impressions: 1000,
    unique_reach: 700,
    reactions: 20,
    comments: 3,
    shares: 1,
    quotes: null,
    bookmarks: null,
    video_plays: null,
    video_watch_time_ms: null,
    video_unique_viewers: null,
    fetched_at: "2025-01-15T13:00:00Z",
  },
  {
    id: "snap-2",
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
  },
];

function createMockChain() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue({
    data: basePub,
    error: null,
  });
  return chain;
}

// ─── Tests ──────────────────────────────────────────────────────────────

describe("GET /api/analytics/posts/[id]", () => {
  let mockChain: ReturnType<typeof createMockChain>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockChain = createMockChain();
    vi.mocked(createAdminClient).mockReturnValue({ from: mockChain.from } as never);
    vi.mocked(getSnapshotsForPost).mockResolvedValue(snapshots as never);
    vi.mocked(getLatestSnapshotForPost).mockResolvedValue(snapshots[1] as never);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as never);

    const res = await GET(makeRequest(), makeContext());
    expect(res.status).toBe(401);
  });

  it("returns 404 when publication not found", async () => {
    mockChain.single.mockResolvedValueOnce({
      data: null,
      error: { code: "PGRST116", message: "Not found" },
    });

    const res = await GET(makeRequest(), makeContext("not-exist"));
    expect(res.status).toBe(404);
  });

  it("returns post detail with metrics history", async () => {
    const res = await GET(makeRequest(), makeContext());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.publication.id).toBe("pub-1");
    expect(json.publication.platform).toBe("linkedin");
    expect(json.snapshots).toHaveLength(2);
    expect(json.latest.impressions).toBe(4500);
  });

  it("passes since param to snapshots query", async () => {
    const since = "2025-01-15T15:00:00Z";
    await GET(makeRequest({ since }), makeContext());

    expect(getSnapshotsForPost).toHaveBeenCalledWith(
      "user-1",
      "urn:li:share:123",
      "linkedin",
      expect.objectContaining({ since }),
    );
  });

  it("passes limit param to snapshots query", async () => {
    await GET(makeRequest({ limit: "200" }), makeContext());

    expect(getSnapshotsForPost).toHaveBeenCalledWith(
      "user-1",
      "urn:li:share:123",
      "linkedin",
      expect.objectContaining({ limit: 200 }),
    );
  });
});
