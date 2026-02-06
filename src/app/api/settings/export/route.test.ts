import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/services/settings", () => ({
  exportUserData: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { exportUserData } from "@/lib/services/settings";

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

describe("POST /api/settings/export", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "all", format: "json" }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("exports data and returns JSON", async () => {
    mockAuth("user-1");
    vi.mocked(exportUserData).mockResolvedValue({
      posts: [{ id: "p-1" }],
      metrics: [{ id: "m-1" }],
      profile: { id: "user-1" },
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "all", format: "json" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveProperty("posts");
    expect(body.data).toHaveProperty("metrics");
  });

  it("returns 400 for invalid export params", async () => {
    mockAuth("user-1");
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "everything", format: "xml" }),
      }),
    );
    expect(response.status).toBe(400);
  });
});
