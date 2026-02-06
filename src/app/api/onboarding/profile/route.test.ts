import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/services/profiles", () => ({
  saveQuickProfile: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { saveQuickProfile } from "@/lib/services/profiles";

async function importRoute() {
  return await import("./route");
}

function mockAuth(user: { id: string } | null) {
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
  } as never);
}

describe("POST /api/onboarding/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const { POST } = await importRoute();
    const request = new Request("http://localhost/api/onboarding/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        primary_niche: "tech_software",
        primary_goal: "build_authority",
        target_audience: "SaaS founders",
      }),
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("saves quick profile and returns data", async () => {
    mockAuth({ id: "user-1" });
    vi.mocked(saveQuickProfile).mockResolvedValue({
      id: "cp-1",
      user_id: "user-1",
      primary_niche: "tech_software",
      primary_goal: "build_authority",
      target_audience: "SaaS founders",
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    });

    const { POST } = await importRoute();
    const request = new Request("http://localhost/api/onboarding/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        primary_niche: "tech_software",
        primary_goal: "build_authority",
        target_audience: "SaaS founders",
      }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile.primary_niche).toBe("tech_software");
    expect(saveQuickProfile).toHaveBeenCalledWith("user-1", {
      primary_niche: "tech_software",
      primary_goal: "build_authority",
      target_audience: "SaaS founders",
    });
  });

  it("returns 400 for invalid profile data", async () => {
    mockAuth({ id: "user-1" });

    const { POST } = await importRoute();
    const request = new Request("http://localhost/api/onboarding/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        primary_niche: "invalid_niche",
        primary_goal: "build_authority",
        target_audience: "Fo",
      }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
