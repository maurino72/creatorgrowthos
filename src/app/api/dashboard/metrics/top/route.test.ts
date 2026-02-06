import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/services/metrics", () => ({
  getTopPosts: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { getTopPosts } from "@/lib/services/metrics";

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

describe("GET /api/dashboard/metrics/top", () => {
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
      "http://localhost:3000/api/dashboard/metrics/top",
    );
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("returns top posts with default params", async () => {
    mockAuth("user-123");
    const mockPosts = [
      { id: "post-1", impressions: 5000, likes: 100 },
      { id: "post-2", impressions: 3000, likes: 60 },
    ];
    vi.mocked(getTopPosts).mockResolvedValue(mockPosts as never);

    const GET = await importGET();
    const request = new Request(
      "http://localhost:3000/api/dashboard/metrics/top",
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.posts).toHaveLength(2);
    expect(getTopPosts).toHaveBeenCalledWith("user-123", 7, 5, undefined);
  });

  it("accepts days and limit query parameters", async () => {
    mockAuth("user-123");
    vi.mocked(getTopPosts).mockResolvedValue([] as never);

    const GET = await importGET();
    const request = new Request(
      "http://localhost:3000/api/dashboard/metrics/top?days=30&limit=3",
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(getTopPosts).toHaveBeenCalledWith("user-123", 30, 3, undefined);
  });
});
