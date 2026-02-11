import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/services/starter-ideas", () => ({
  generateStarterIdeas: vi.fn(),
}));

vi.mock("@/lib/services/profiles", () => ({
  getCreatorProfile: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { generateStarterIdeas } from "@/lib/services/starter-ideas";
import { getCreatorProfile } from "@/lib/services/profiles";

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

describe("POST /api/onboarding/ideas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const { POST } = await importRoute();
    const request = new Request("http://localhost/api/onboarding/ideas", {
      method: "POST",
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("generates starter ideas based on profile with arrays", async () => {
    mockAuth({ id: "user-1" });
    vi.mocked(getCreatorProfile).mockResolvedValue({
      id: "cp-1",
      user_id: "user-1",
      niches: ["tech_software", "marketing"],
      goals: ["build_authority"],
      target_audience: "SaaS founders",
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    });
    vi.mocked(generateStarterIdeas).mockResolvedValue([
      { idea: "Idea 1", hook: "Hook 1" },
      { idea: "Idea 2", hook: "Hook 2" },
      { idea: "Idea 3", hook: "Hook 3" },
    ]);

    const { POST } = await importRoute();
    const request = new Request("http://localhost/api/onboarding/ideas", {
      method: "POST",
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ideas).toHaveLength(3);
    expect(body.preview).toHaveLength(3);
    expect(generateStarterIdeas).toHaveBeenCalledWith({
      niches: ["tech_software", "marketing"],
      goals: ["build_authority"],
      target_audience: "SaaS founders",
    });
  });

  it("returns 400 when no profile exists", async () => {
    mockAuth({ id: "user-1" });
    vi.mocked(getCreatorProfile).mockResolvedValue(null);

    const { POST } = await importRoute();
    const request = new Request("http://localhost/api/onboarding/ideas", {
      method: "POST",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
