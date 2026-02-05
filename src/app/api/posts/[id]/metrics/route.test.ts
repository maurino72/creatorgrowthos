import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/services/metrics", () => ({
  getMetricsForPost: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { getMetricsForPost } from "@/lib/services/metrics";

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

describe("GET /api/posts/:id/metrics", () => {
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
      "http://localhost:3000/api/posts/post-1/metrics",
    );
    const response = await GET(request, makeParams("post-1"));
    expect(response.status).toBe(401);
  });

  it("returns metric events for a post", async () => {
    mockAuth("user-123");
    const mockEvents = [
      { id: "event-1", impressions: 1500, observed_at: "2024-01-02T00:00:00Z" },
      { id: "event-2", impressions: 500, observed_at: "2024-01-01T00:00:00Z" },
    ];
    vi.mocked(getMetricsForPost).mockResolvedValue(mockEvents as never);

    const GET = await importGET();
    const request = new Request(
      "http://localhost:3000/api/posts/post-1/metrics",
    );
    const response = await GET(request, makeParams("post-1"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.metrics).toHaveLength(2);
    expect(getMetricsForPost).toHaveBeenCalledWith("user-123", "post-1", {
      limit: 50,
      since: undefined,
    });
  });

  it("passes limit and since query params to service", async () => {
    mockAuth("user-123");
    vi.mocked(getMetricsForPost).mockResolvedValue([] as never);

    const GET = await importGET();
    const request = new Request(
      "http://localhost:3000/api/posts/post-1/metrics?limit=10&since=2024-01-01T00:00:00Z",
    );
    const response = await GET(request, makeParams("post-1"));

    expect(response.status).toBe(200);
    expect(getMetricsForPost).toHaveBeenCalledWith("user-123", "post-1", {
      limit: 10,
      since: "2024-01-01T00:00:00Z",
    });
  });

  it("returns 500 on service error", async () => {
    mockAuth("user-123");
    vi.mocked(getMetricsForPost).mockRejectedValue(new Error("DB error"));

    const GET = await importGET();
    const request = new Request(
      "http://localhost:3000/api/posts/post-1/metrics",
    );
    const response = await GET(request, makeParams("post-1"));
    expect(response.status).toBe(500);
  });
});
