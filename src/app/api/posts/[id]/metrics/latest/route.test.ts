import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/services/metrics", () => ({
  getLatestMetricsForPost: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { getLatestMetricsForPost } from "@/lib/services/metrics";

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

type RouteParams = { params: Promise<{ id: string }> };

function makeParams(id: string): RouteParams {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/posts/:id/metrics/latest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function importGET() {
    const mod = await import("./route");
    return mod.GET;
  }

  it("returns 401 for unauthenticated user", async () => {
    mockAuth(null);
    const GET = await importGET();
    const request = new Request(
      "http://localhost:3000/api/posts/post-1/metrics/latest",
    );
    const response = await GET(request, makeParams("post-1"));
    expect(response.status).toBe(401);
  });

  it("returns latest metrics for a post", async () => {
    mockAuth("user-123");
    const mockLatest = [
      {
        id: "event-1",
        post_publication_id: "pub-1",
        impressions: 1500,
        likes: 42,
        replies: 7,
        reposts: 12,
        engagement_rate: 0.041,
        observed_at: "2024-01-02T12:00:00Z",
      },
    ];
    vi.mocked(getLatestMetricsForPost).mockResolvedValue(mockLatest as never);

    const GET = await importGET();
    const request = new Request(
      "http://localhost:3000/api/posts/post-1/metrics/latest",
    );
    const response = await GET(request, makeParams("post-1"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.metrics).toHaveLength(1);
    expect(body.metrics[0].impressions).toBe(1500);
    expect(getLatestMetricsForPost).toHaveBeenCalledWith("user-123", "post-1");
  });

  it("returns 500 on service error", async () => {
    mockAuth("user-123");
    vi.mocked(getLatestMetricsForPost).mockRejectedValue(new Error("DB error"));

    const GET = await importGET();
    const request = new Request(
      "http://localhost:3000/api/posts/post-1/metrics/latest",
    );
    const response = await GET(request, makeParams("post-1"));
    expect(response.status).toBe(500);
  });
});
