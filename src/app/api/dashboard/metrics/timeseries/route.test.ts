import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/services/metrics", () => ({
  getMetricsTimeSeries: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { getMetricsTimeSeries } from "@/lib/services/metrics";

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

describe("GET /api/dashboard/metrics/timeseries", () => {
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
    const request = new Request("http://localhost:3000/api/dashboard/metrics/timeseries");
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("returns time-series data for default 7-day period", async () => {
    mockAuth("user-123");
    const mockData = [
      { date: "2025-01-15", impressions: 300, likes: 30, replies: 10, reposts: 15, engagement: 55 },
      { date: "2025-01-16", impressions: 150, likes: 12, replies: 4, reposts: 6, engagement: 22 },
    ];
    vi.mocked(getMetricsTimeSeries).mockResolvedValue(mockData);

    const GET = await importGET();
    const request = new Request("http://localhost:3000/api/dashboard/metrics/timeseries");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.series).toHaveLength(2);
    expect(body.series[0].date).toBe("2025-01-15");
    expect(getMetricsTimeSeries).toHaveBeenCalledWith("user-123", 7, undefined);
  });

  it("accepts days and platform query parameters", async () => {
    mockAuth("user-123");
    vi.mocked(getMetricsTimeSeries).mockResolvedValue([]);

    const GET = await importGET();
    const request = new Request(
      "http://localhost:3000/api/dashboard/metrics/timeseries?days=30&platform=twitter",
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(getMetricsTimeSeries).toHaveBeenCalledWith("user-123", 30, "twitter");
  });

  it("returns 500 on service error", async () => {
    mockAuth("user-123");
    vi.mocked(getMetricsTimeSeries).mockRejectedValue(new Error("DB error"));

    const GET = await importGET();
    const request = new Request("http://localhost:3000/api/dashboard/metrics/timeseries");
    const response = await GET(request);

    expect(response.status).toBe(500);
  });
});
