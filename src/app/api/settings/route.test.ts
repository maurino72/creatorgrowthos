import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/services/settings", () => ({
  getSettings: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/services/settings";

function mockAuth(userId: string | null) {
  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userId ? { id: userId } : null },
      }),
    },
  };
  vi.mocked(createClient).mockResolvedValue(supabase as never);
}

describe("GET /api/settings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const { GET } = await import("./route");
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns settings for authenticated user", async () => {
    mockAuth("user-1");
    vi.mocked(getSettings).mockResolvedValue({
      profile: {
        id: "user-1",
        full_name: "Test",
        email: "test@example.com",
        avatar_url: null,
        bio: null,
        website: null,
        timezone: "UTC",
      },
      preferences: {} as never,
    });

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile.full_name).toBe("Test");
  });
});
