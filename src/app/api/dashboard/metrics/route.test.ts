import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/services/metrics", () => ({
  getDashboardMetrics: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { getDashboardMetrics } from "@/lib/services/metrics";

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

describe("GET /api/dashboard/metrics", () => {
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
    const request = new Request("http://localhost:3000/api/dashboard/metrics");
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("returns dashboard metrics for default 7-day period", async () => {
    mockAuth("user-123");
    const mockMetrics = {
      totalImpressions: 5000,
      totalLikes: 150,
      totalReplies: 30,
      totalReposts: 50,
      totalEngagement: 230,
      averageEngagementRate: 0.046,
      postCount: 10,
    };
    vi.mocked(getDashboardMetrics).mockResolvedValue(mockMetrics);

    const GET = await importGET();
    const request = new Request("http://localhost:3000/api/dashboard/metrics");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.totalImpressions).toBe(5000);
    expect(getDashboardMetrics).toHaveBeenCalledWith("user-123", 7, undefined);
  });

  it("accepts days query parameter", async () => {
    mockAuth("user-123");
    vi.mocked(getDashboardMetrics).mockResolvedValue({
      totalImpressions: 0,
      totalLikes: 0,
      totalReplies: 0,
      totalReposts: 0,
      totalEngagement: 0,
      averageEngagementRate: 0,
      postCount: 0,
    });

    const GET = await importGET();
    const request = new Request(
      "http://localhost:3000/api/dashboard/metrics?days=30",
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(getDashboardMetrics).toHaveBeenCalledWith("user-123", 30, undefined);
  });
});
