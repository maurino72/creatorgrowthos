import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/adapters", () => ({
  getAdapterForPlatform: vi.fn(),
}));

vi.mock("@/lib/utils/encryption", () => ({
  decrypt: vi.fn((val: string) => `decrypted:${val}`),
}));

vi.mock("@/lib/services/connections", () => ({
  getConnectionByPlatform: vi.fn(),
  updateTokens: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { getAdapterForPlatform } from "@/lib/adapters";
import { getConnectionByPlatform, updateTokens } from "@/lib/services/connections";

describe("POST /api/connections/linkedin/refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function importPOST() {
    const mod = await import("./route");
    return mod.POST;
  }

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

  it("returns 401 for unauthenticated user", async () => {
    mockAuth(null);
    const POST = await importPOST();
    const request = new Request("http://localhost:3000/api/connections/linkedin/refresh", {
      method: "POST",
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("returns 404 when no connection exists", async () => {
    mockAuth("user-123");
    vi.mocked(getConnectionByPlatform).mockResolvedValue(null);
    const POST = await importPOST();
    const request = new Request("http://localhost:3000/api/connections/linkedin/refresh", {
      method: "POST",
    });
    const response = await POST(request);
    expect(response.status).toBe(404);
  });

  it("returns 400 when no refresh token available", async () => {
    mockAuth("user-123");
    vi.mocked(getConnectionByPlatform).mockResolvedValue({
      id: "conn-1",
      refresh_token_enc: null,
    } as never);

    const POST = await importPOST();
    const request = new Request("http://localhost:3000/api/connections/linkedin/refresh", {
      method: "POST",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("refreshes tokens and returns success", async () => {
    mockAuth("user-123");
    vi.mocked(getConnectionByPlatform).mockResolvedValue({
      id: "conn-1",
      refresh_token_enc: "encrypted-refresh",
    } as never);

    const adapter = {
      refreshTokens: vi.fn().mockResolvedValue({
        accessToken: "new-access",
        refreshToken: "new-refresh",
        expiresAt: new Date("2025-06-01"),
      }),
    };
    vi.mocked(getAdapterForPlatform).mockReturnValue(adapter as never);
    vi.mocked(updateTokens).mockResolvedValue(undefined);

    const POST = await importPOST();
    const request = new Request("http://localhost:3000/api/connections/linkedin/refresh", {
      method: "POST",
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(updateTokens).toHaveBeenCalledWith("conn-1", {
      accessToken: "new-access",
      refreshToken: "new-refresh",
      expiresAt: expect.any(Date),
    });
  });

  it("returns 500 when refresh fails", async () => {
    mockAuth("user-123");
    vi.mocked(getConnectionByPlatform).mockResolvedValue({
      id: "conn-1",
      refresh_token_enc: "encrypted-refresh",
    } as never);

    const adapter = {
      refreshTokens: vi.fn().mockRejectedValue(new Error("Token refresh failed")),
    };
    vi.mocked(getAdapterForPlatform).mockReturnValue(adapter as never);

    const POST = await importPOST();
    const request = new Request("http://localhost:3000/api/connections/linkedin/refresh", {
      method: "POST",
    });
    const response = await POST(request);
    expect(response.status).toBe(500);
  });
});
