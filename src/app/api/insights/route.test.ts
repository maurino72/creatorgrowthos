import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/services/insights", () => ({
  getInsightsForUser: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { getInsightsForUser } from "@/lib/services/insights";

async function importRoute() {
  const mod = await import("./route");
  return mod;
}

function mockAuth(user: { id: string } | null) {
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
      }),
    },
  } as never);
}

describe("GET /api/insights", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const { GET } = await importRoute();

    const request = new Request("http://localhost/api/insights");
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it("returns insights for authenticated user", async () => {
    mockAuth({ id: "user-1" });
    const mockInsights = [
      { id: "i1", type: "performance_pattern", headline: "Test insight", status: "active" },
    ];
    vi.mocked(getInsightsForUser).mockResolvedValue(mockInsights as never);

    const { GET } = await importRoute();
    const request = new Request("http://localhost/api/insights");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.insights).toEqual(mockInsights);
  });

  it("passes query params to service", async () => {
    mockAuth({ id: "user-1" });
    vi.mocked(getInsightsForUser).mockResolvedValue([]);

    const { GET } = await importRoute();
    const request = new Request("http://localhost/api/insights?status=dismissed&type=anomaly&limit=5");
    await GET(request);

    expect(getInsightsForUser).toHaveBeenCalledWith("user-1", {
      status: "dismissed",
      type: "anomaly",
      limit: 5,
    });
  });

  it("uses defaults when no query params", async () => {
    mockAuth({ id: "user-1" });
    vi.mocked(getInsightsForUser).mockResolvedValue([]);

    const { GET } = await importRoute();
    const request = new Request("http://localhost/api/insights");
    await GET(request);

    expect(getInsightsForUser).toHaveBeenCalledWith("user-1", {
      status: undefined,
      type: undefined,
      platform: undefined,
      limit: 10,
    });
  });

  it("passes platform query param to service", async () => {
    mockAuth({ id: "user-1" });
    vi.mocked(getInsightsForUser).mockResolvedValue([]);

    const { GET } = await importRoute();
    const request = new Request("http://localhost/api/insights?platform=twitter");
    await GET(request);

    expect(getInsightsForUser).toHaveBeenCalledWith("user-1", expect.objectContaining({
      platform: "twitter",
    }));
  });
});
