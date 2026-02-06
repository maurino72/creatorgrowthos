import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/services/settings", () => ({
  updatePreferences: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { updatePreferences } from "@/lib/services/settings";

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

describe("PATCH /api/settings/preferences", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "ai", settings: { enabled: false } }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("updates preferences for valid section", async () => {
    mockAuth("user-1");
    vi.mocked(updatePreferences).mockResolvedValue(undefined);

    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "ai",
          settings: { enabled: false, writing_style: "professional" },
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(updatePreferences).toHaveBeenCalledWith("user-1", "ai", {
      enabled: false,
      writing_style: "professional",
    });
  });

  it("returns 400 for invalid section", async () => {
    mockAuth("user-1");
    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "billing", settings: {} }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid settings within section", async () => {
    mockAuth("user-1");
    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("http://localhost", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "ai",
          settings: { writing_style: "invalid_style" },
        }),
      }),
    );
    expect(response.status).toBe(400);
  });
});
