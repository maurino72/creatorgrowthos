import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/services/usage", () => ({
  getUserUsage: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { getUserUsage } from "@/lib/services/usage";
import { GET } from "./route";

const TEST_USER = { id: "user-123", email: "test@example.com" };

describe("GET /api/billing/usage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as never);

    const request = new NextRequest(
      "http://localhost:3000/api/billing/usage"
    );
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("returns usage data", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: TEST_USER }, error: null }),
      },
    } as never);

    vi.mocked(getUserUsage).mockResolvedValue({
      posts_used: 12,
      posts_limit: 30,
      ai_improvements_used: 1,
      ai_improvements_limit: 5,
      insights_used: 2,
      insights_limit: 5,
      period_end: "2024-02-01T00:00:00Z",
    });

    const request = new NextRequest(
      "http://localhost:3000/api/billing/usage"
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.usage.posts_used).toBe(12);
    expect(data.usage.posts_limit).toBe(30);
  });

  it("returns null when no subscription", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: TEST_USER }, error: null }),
      },
    } as never);

    vi.mocked(getUserUsage).mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost:3000/api/billing/usage"
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.usage).toBeNull();
  });

  it("returns 500 with detail when service throws", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: TEST_USER }, error: null }),
      },
    } as never);

    vi.mocked(getUserUsage).mockRejectedValue(
      new Error("relation \"usage_tracking\" does not exist")
    );

    const request = new NextRequest(
      "http://localhost:3000/api/billing/usage"
    );
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Failed to fetch usage");
    expect(data.detail).toBe("relation \"usage_tracking\" does not exist");
  });
});
