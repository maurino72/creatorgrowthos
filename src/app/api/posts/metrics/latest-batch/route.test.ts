import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/services/metrics", () => ({
  getLatestMetricsBatch: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { getLatestMetricsBatch } from "@/lib/services/metrics";
import { GET } from "./route";

describe("GET /api/posts/metrics/latest-batch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockAuth(userId: string | null) {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: userId ? { id: userId } : null },
        }),
      },
    } as never);
  }

  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const req = new NextRequest("http://localhost/api/posts/metrics/latest-batch?post_ids=p1,p2");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when post_ids is missing", async () => {
    mockAuth("user-1");
    const req = new NextRequest("http://localhost/api/posts/metrics/latest-batch");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns batch metrics for multiple post IDs", async () => {
    mockAuth("user-1");
    const mockMetrics = {
      "post-1": [{ id: "e1", impressions: 100 }],
      "post-2": [{ id: "e2", impressions: 200 }],
    };
    vi.mocked(getLatestMetricsBatch).mockResolvedValue(mockMetrics);

    const req = new NextRequest("http://localhost/api/posts/metrics/latest-batch?post_ids=post-1,post-2");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.metrics).toEqual(mockMetrics);
    expect(getLatestMetricsBatch).toHaveBeenCalledWith("user-1", ["post-1", "post-2"]);
  });

  it("returns empty metrics for empty post_ids string", async () => {
    mockAuth("user-1");
    const req = new NextRequest("http://localhost/api/posts/metrics/latest-batch?post_ids=");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns 500 on service error", async () => {
    mockAuth("user-1");
    vi.mocked(getLatestMetricsBatch).mockRejectedValue(new Error("DB down"));

    const req = new NextRequest("http://localhost/api/posts/metrics/latest-batch?post_ids=post-1");
    const res = await GET(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("DB down");
  });
});
