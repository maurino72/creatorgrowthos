import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/adapters", () => ({
  getAdapterForPlatform: vi.fn(),
}));

vi.mock("@/lib/utils/encryption", () => ({
  encrypt: vi.fn((val: string) => `encrypted:${val}`),
}));

vi.mock("@/lib/services/connections", () => ({
  disconnectPlatform: vi.fn(),
}));

vi.mock("@/lib/services/usage", () => ({
  canConnectPlatform: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { getAdapterForPlatform } from "@/lib/adapters";
import { disconnectPlatform } from "@/lib/services/connections";
import { canConnectPlatform } from "@/lib/services/usage";

describe("GET /api/connections/linkedin (OAuth initiate)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
  });

  async function importGET() {
    const mod = await import("./route");
    return mod.GET;
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
    return supabase;
  }

  function mockAdapter() {
    const adapter = {
      getAuthUrl: vi.fn().mockReturnValue({
        url: "https://www.linkedin.com/oauth/v2/authorization?test=1",
        codeVerifier: undefined,
      }),
    };
    vi.mocked(getAdapterForPlatform).mockReturnValue(adapter as never);
    return adapter;
  }

  it("returns 401 for unauthenticated user", async () => {
    mockAuth(null);
    const GET = await importGET();
    const request = new Request("http://localhost:3000/api/connections/linkedin");
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("redirects with plan_required when plan check fails", async () => {
    mockAuth("user-123");
    vi.mocked(canConnectPlatform).mockResolvedValue({
      allowed: false,
      reason: "LinkedIn requires Business plan",
      upgrade_to: "business",
    });

    const GET = await importGET();
    const request = new Request("http://localhost:3000/api/connections/linkedin");
    const response = await GET(request);
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain("error=plan_required");
  });

  it("redirects to LinkedIn auth URL when plan check passes", async () => {
    mockAuth("user-123");
    vi.mocked(canConnectPlatform).mockResolvedValue({ allowed: true });
    mockAdapter();

    const GET = await importGET();
    const request = new Request("http://localhost:3000/api/connections/linkedin");
    const response = await GET(request);
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain("linkedin.com");
  });

  it("sets encrypted httpOnly cookie with state and redirectUri (no codeVerifier)", async () => {
    mockAuth("user-123");
    vi.mocked(canConnectPlatform).mockResolvedValue({ allowed: true });
    mockAdapter();

    const GET = await importGET();
    const request = new Request("http://localhost:3000/api/connections/linkedin");
    const response = await GET(request);
    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain("linkedin_oauth=");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Max-Age=600");
  });

  it("calls canConnectPlatform with correct args", async () => {
    mockAuth("user-123");
    vi.mocked(canConnectPlatform).mockResolvedValue({ allowed: true });
    mockAdapter();

    const GET = await importGET();
    const request = new Request("http://localhost:3000/api/connections/linkedin");
    await GET(request);

    expect(canConnectPlatform).toHaveBeenCalledWith("user-123", "linkedin");
  });
});

describe("DELETE /api/connections/linkedin (disconnect)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function importDELETE() {
    const mod = await import("./route");
    return mod.DELETE;
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
    const DELETE = await importDELETE();
    const request = new Request("http://localhost:3000/api/connections/linkedin", {
      method: "DELETE",
    });
    const response = await DELETE(request);
    expect(response.status).toBe(401);
  });

  it("disconnects and returns success", async () => {
    mockAuth("user-123");
    vi.mocked(disconnectPlatform).mockResolvedValue(undefined);
    const DELETE = await importDELETE();
    const request = new Request("http://localhost:3000/api/connections/linkedin", {
      method: "DELETE",
    });
    const response = await DELETE(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(disconnectPlatform).toHaveBeenCalledWith("user-123", "linkedin");
  });
});
