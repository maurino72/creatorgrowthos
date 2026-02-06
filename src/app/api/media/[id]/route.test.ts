import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/services/media", () => ({
  deleteImage: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { deleteImage } from "@/lib/services/media";

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

describe("DELETE /api/media/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function importDELETE() {
    const mod = await import("./route");
    return mod.DELETE;
  }

  it("returns 401 for unauthenticated user", async () => {
    mockAuth(null);
    const DELETE = await importDELETE();
    const request = new Request("http://localhost:3000/api/media/abc-123");
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "abc-123" }),
    });
    expect(response.status).toBe(401);
  });

  it("deletes image and returns 200", async () => {
    mockAuth("user-123");
    vi.mocked(deleteImage).mockResolvedValue(undefined);

    const DELETE = await importDELETE();
    const request = new Request("http://localhost:3000/api/media/abc-123");
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "abc-123" }),
    });

    expect(response.status).toBe(200);
    // Path should be constructed as userId/id
    expect(deleteImage).toHaveBeenCalledWith("user-123/abc-123");
  });

  it("returns 500 when delete fails", async () => {
    mockAuth("user-123");
    vi.mocked(deleteImage).mockRejectedValue(new Error("File not found"));

    const DELETE = await importDELETE();
    const request = new Request("http://localhost:3000/api/media/abc-123");
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "abc-123" }),
    });

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("File not found");
  });
});
