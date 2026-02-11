import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/services/profiles", () => ({
  getCreatorProfile: vi.fn(),
  updateCreatorProfile: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import {
  getCreatorProfile,
  updateCreatorProfile,
} from "@/lib/services/profiles";

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

const mockProfile = {
  id: "cp-1",
  user_id: "user-1",
  niches: ["tech_software", "marketing"],
  goals: ["build_authority"],
  target_audience: "SaaS founders",
  created_at: "2024-01-01",
  updated_at: "2024-01-01",
};

describe("GET /api/settings/creator-profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const { GET } = await importRoute();
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns creator profile when it exists", async () => {
    mockAuth({ id: "user-1" });
    vi.mocked(getCreatorProfile).mockResolvedValue(mockProfile);

    const { GET } = await importRoute();
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile).toEqual(mockProfile);
    expect(getCreatorProfile).toHaveBeenCalledWith("user-1");
  });

  it("returns null when no profile exists", async () => {
    mockAuth({ id: "user-1" });
    vi.mocked(getCreatorProfile).mockResolvedValue(null);

    const { GET } = await importRoute();
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile).toBeNull();
  });
});

describe("PATCH /api/settings/creator-profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const { PATCH } = await importRoute();
    const request = new Request(
      "http://localhost/api/settings/creator-profile",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niches: ["tech_software"] }),
      },
    );
    const response = await PATCH(request);
    expect(response.status).toBe(401);
  });

  it("updates niches", async () => {
    mockAuth({ id: "user-1" });
    vi.mocked(updateCreatorProfile).mockResolvedValue({
      ...mockProfile,
      niches: ["design", "creative"],
    });

    const { PATCH } = await importRoute();
    const request = new Request(
      "http://localhost/api/settings/creator-profile",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niches: ["design", "creative"] }),
      },
    );
    const response = await PATCH(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile.niches).toEqual(["design", "creative"]);
    expect(updateCreatorProfile).toHaveBeenCalledWith("user-1", {
      niches: ["design", "creative"],
    });
  });

  it("updates goals", async () => {
    mockAuth({ id: "user-1" });
    vi.mocked(updateCreatorProfile).mockResolvedValue({
      ...mockProfile,
      goals: ["grow_audience", "get_clients"],
    });

    const { PATCH } = await importRoute();
    const request = new Request(
      "http://localhost/api/settings/creator-profile",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goals: ["grow_audience", "get_clients"] }),
      },
    );
    const response = await PATCH(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile.goals).toEqual(["grow_audience", "get_clients"]);
  });

  it("updates target_audience", async () => {
    mockAuth({ id: "user-1" });
    vi.mocked(updateCreatorProfile).mockResolvedValue({
      ...mockProfile,
      target_audience: "Indie hackers",
    });

    const { PATCH } = await importRoute();
    const request = new Request(
      "http://localhost/api/settings/creator-profile",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_audience: "Indie hackers" }),
      },
    );
    const response = await PATCH(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.profile.target_audience).toBe("Indie hackers");
  });

  it("returns 400 for invalid data", async () => {
    mockAuth({ id: "user-1" });

    const { PATCH } = await importRoute();
    const request = new Request(
      "http://localhost/api/settings/creator-profile",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niches: ["invalid_niche"] }),
      },
    );
    const response = await PATCH(request);
    expect(response.status).toBe(400);
  });

  it("returns 400 for too many niches", async () => {
    mockAuth({ id: "user-1" });

    const { PATCH } = await importRoute();
    const request = new Request(
      "http://localhost/api/settings/creator-profile",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niches: ["tech_software", "marketing", "design", "finance"],
        }),
      },
    );
    const response = await PATCH(request);
    expect(response.status).toBe(400);
  });
});
