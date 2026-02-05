import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/services/metrics", () => ({
  insertMetricEvent: vi.fn(),
}));

vi.mock("@/lib/services/connections", () => ({
  getConnectionByPlatform: vi.fn(),
}));

vi.mock("@/lib/adapters", () => ({
  getAdapterForPlatform: vi.fn(),
}));

vi.mock("@/lib/utils/encryption", () => ({
  decrypt: vi.fn((val: string) => `decrypted-${val}`),
}));

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertMetricEvent } from "@/lib/services/metrics";
import { getConnectionByPlatform } from "@/lib/services/connections";
import { getAdapterForPlatform } from "@/lib/adapters";

function mockAuth(userId: string | null) {
  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userId ? { id: userId } : null },
        error: userId ? null : { message: "No session" },
      }),
    },
  };
  vi.mocked(createClient).mockResolvedValue(supabase as never);
}

function mockAdminSupabase(publications: unknown[] = []) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
  };
  for (const method of Object.keys(chain)) {
    chain[method].mockReturnValue(chain);
  }
  chain.not.mockResolvedValue({ data: publications, error: null });

  const from = vi.fn().mockReturnValue(chain);
  vi.mocked(createAdminClient).mockReturnValue({ from } as never);
  return { from, chain };
}

type RouteParams = { params: Promise<{ id: string }> };

function makeParams(id: string): RouteParams {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/posts/:id/metrics/refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function importPOST() {
    const mod = await import("./route");
    return mod.POST;
  }

  it("returns 401 for unauthenticated user", async () => {
    mockAuth(null);
    const POST = await importPOST();
    const request = new Request(
      "http://localhost:3000/api/posts/post-1/metrics/refresh",
      { method: "POST" },
    );
    const response = await POST(request, makeParams("post-1"));
    expect(response.status).toBe(401);
  });

  it("fetches and stores fresh metrics for all publications of a post", async () => {
    mockAuth("user-123");
    const publications = [
      {
        id: "pub-1",
        platform: "twitter",
        platform_post_id: "tweet-123",
        published_at: new Date().toISOString(),
        user_id: "user-123",
      },
    ];
    mockAdminSupabase(publications);

    vi.mocked(getConnectionByPlatform).mockResolvedValue({
      id: "conn-1",
      access_token_enc: "enc-token",
      platform: "twitter",
      token_expires_at: new Date(Date.now() + 3600000).toISOString(),
    } as never);

    const mockAdapter = {
      fetchPostMetrics: vi.fn().mockResolvedValue({
        impressions: 2000,
        likes: 55,
        replies: 10,
        reposts: 15,
        observedAt: new Date(),
      }),
    };
    vi.mocked(getAdapterForPlatform).mockReturnValue(mockAdapter as never);
    vi.mocked(insertMetricEvent).mockResolvedValue({ id: "event-1" } as never);

    const POST = await importPOST();
    const request = new Request(
      "http://localhost:3000/api/posts/post-1/metrics/refresh",
      { method: "POST" },
    );
    const response = await POST(request, makeParams("post-1"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.refreshed).toBe(1);
    expect(body.failed).toBe(0);
    expect(insertMetricEvent).toHaveBeenCalledTimes(1);
  });

  it("returns 200 with zero refreshed when no publications found", async () => {
    mockAuth("user-123");
    mockAdminSupabase([]);

    const POST = await importPOST();
    const request = new Request(
      "http://localhost:3000/api/posts/post-1/metrics/refresh",
      { method: "POST" },
    );
    const response = await POST(request, makeParams("post-1"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.refreshed).toBe(0);
  });
});
