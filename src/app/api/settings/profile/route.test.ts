import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/services/settings", () => ({
  updateProfile: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { updateProfile } from "@/lib/services/settings";

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

describe("PATCH /api/settings/profile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: "Test" }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("updates profile and returns success", async () => {
    mockAuth("user-1");
    vi.mocked(updateProfile).mockResolvedValue(undefined);

    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: "New Name", bio: "My bio" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(updateProfile).toHaveBeenCalledWith("user-1", {
      full_name: "New Name",
      bio: "My bio",
    });
  });

  it("returns 400 for invalid data", async () => {
    mockAuth("user-1");
    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: "x".repeat(101) }),
      }),
    );
    expect(response.status).toBe(400);
  });
});
