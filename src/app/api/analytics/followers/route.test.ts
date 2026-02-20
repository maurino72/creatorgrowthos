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

vi.mock("@/lib/services/follower-snapshots", () => ({
  getFollowerGrowth: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { getFollowerGrowth } from "@/lib/services/follower-snapshots";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Helpers ────────────────────────────────────────────────────────────

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/analytics/followers");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new Request(url.toString());
}

function createMockChain() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockResolvedValue({
    data: [
      { platform: "linkedin", user_id: "user-1" },
      { platform: "twitter", user_id: "user-1" },
    ],
    error: null,
  });
  return chain;
}

const linkedinGrowth = {
  currentCount: 4500,
  startCount: 4320,
  netGrowth: 180,
  growthRate: 4.2,
  daily: [
    { follower_count: 4320, new_followers: 5, snapshot_date: "2025-01-01" },
    { follower_count: 4325, new_followers: 8, snapshot_date: "2025-01-02" },
  ],
};

const twitterGrowth = {
  currentCount: 8200,
  startCount: 7880,
  netGrowth: 320,
  growthRate: 4.1,
  daily: [
    { follower_count: 7880, new_followers: 12, snapshot_date: "2025-01-01" },
    { follower_count: 7892, new_followers: 15, snapshot_date: "2025-01-02" },
  ],
};

// ─── Tests ──────────────────────────────────────────────────────────────

describe("GET /api/analytics/followers", () => {
  let mockChain: ReturnType<typeof createMockChain>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockChain = createMockChain();
    vi.mocked(createAdminClient).mockReturnValue({ from: mockChain.from } as never);
    vi.mocked(getFollowerGrowth)
      .mockResolvedValueOnce(linkedinGrowth)
      .mockResolvedValueOnce(twitterGrowth);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as never);

    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns follower data per platform", async () => {
    const res = await GET(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.period).toBe("30d");
    expect(json.platforms.linkedin.current_count).toBe(4500);
    expect(json.platforms.linkedin.net_growth).toBe(180);
    expect(json.platforms.twitter.current_count).toBe(8200);
    expect(json.platforms.twitter.net_growth).toBe(320);
  });

  it("includes daily data points", async () => {
    const res = await GET(makeRequest());
    const json = await res.json();

    expect(json.platforms.linkedin.daily).toHaveLength(2);
    expect(json.platforms.linkedin.daily[0].count).toBe(4320);
    expect(json.platforms.linkedin.daily[0].new).toBe(5);
    expect(json.platforms.linkedin.daily[0].date).toBe("2025-01-01");
  });

  it("respects period parameter", async () => {
    vi.mocked(getFollowerGrowth)
      .mockReset()
      .mockResolvedValueOnce(linkedinGrowth)
      .mockResolvedValueOnce(twitterGrowth);

    await GET(makeRequest({ period: "7d" }));

    expect(getFollowerGrowth).toHaveBeenCalledWith("user-1", "linkedin", 7);
    expect(getFollowerGrowth).toHaveBeenCalledWith("user-1", "twitter", 7);
  });

  it("handles no connections gracefully", async () => {
    mockChain.order.mockResolvedValueOnce({ data: [], error: null });

    const res = await GET(makeRequest());
    const json = await res.json();

    expect(json.platforms).toEqual({});
  });

  it("filters by specific platform when provided", async () => {
    mockChain.order.mockResolvedValueOnce({
      data: [{ platform: "linkedin", user_id: "user-1" }],
      error: null,
    });
    vi.mocked(getFollowerGrowth)
      .mockReset()
      .mockResolvedValueOnce(linkedinGrowth);

    const res = await GET(makeRequest({ platform: "linkedin" }));
    const json = await res.json();

    expect(json.platforms.linkedin).toBeDefined();
    expect(json.platforms.twitter).toBeUndefined();
  });
});
