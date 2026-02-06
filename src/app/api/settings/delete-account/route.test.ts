import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/services/settings", () => ({
  deleteAccount: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { deleteAccount } from "@/lib/services/settings";

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

describe("POST /api/settings/delete-account", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "DELETE" }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("deletes account with correct confirmation", async () => {
    mockAuth("user-1");
    vi.mocked(deleteAccount).mockResolvedValue(undefined);

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "DELETE" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(deleteAccount).toHaveBeenCalledWith("user-1");
  });

  it("returns 400 for wrong confirmation", async () => {
    mockAuth("user-1");
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "delete" }),
      }),
    );
    expect(response.status).toBe(400);
  });
});
