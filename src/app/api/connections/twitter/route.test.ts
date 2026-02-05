import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all dependencies before importing the route
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

import { createClient } from "@/lib/supabase/server";
import { getAdapterForPlatform } from "@/lib/adapters";
import { disconnectPlatform } from "@/lib/services/connections";

describe("GET /api/connections/twitter (OAuth initiate)", () => {
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
        url: "https://twitter.com/i/oauth2/authorize?test=1",
        codeVerifier: "test-verifier-abc",
      }),
    };
    vi.mocked(getAdapterForPlatform).mockReturnValue(adapter as never);
    return adapter;
  }

  it("returns 401 for unauthenticated user", async () => {
    mockAuth(null);
    const GET = await importGET();
    const request = new Request("http://localhost:3000/api/connections/twitter");
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("redirects to Twitter auth URL for authenticated user", async () => {
    mockAuth("user-123");
    mockAdapter();
    const GET = await importGET();
    const request = new Request("http://localhost:3000/api/connections/twitter");
    const response = await GET(request);
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain("twitter.com");
  });

  it("sets encrypted httpOnly cookie with state, codeVerifier, and redirectUri", async () => {
    mockAuth("user-123");
    mockAdapter();
    const GET = await importGET();
    const request = new Request("http://localhost:3000/api/connections/twitter");
    const response = await GET(request);
    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain("twitter_oauth=");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Max-Age=600");
    expect(setCookie).toContain("SameSite=Lax");
  });

  it("omits Secure flag on http (localhost)", async () => {
    mockAuth("user-123");
    mockAdapter();
    const GET = await importGET();
    const request = new Request("http://localhost:3000/api/connections/twitter");
    const response = await GET(request);
    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).not.toContain("Secure");
  });

  it("includes Secure flag on https", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://myapp.com");
    mockAuth("user-123");
    mockAdapter();
    const GET = await importGET();
    const request = new Request("https://myapp.com/api/connections/twitter");
    const response = await GET(request);
    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain("Secure");
  });
});

describe("DELETE /api/connections/twitter (disconnect)", () => {
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
    return supabase;
  }

  it("returns 401 for unauthenticated user", async () => {
    mockAuth(null);
    const DELETE = await importDELETE();
    const request = new Request("http://localhost:3000/api/connections/twitter", {
      method: "DELETE",
    });
    const response = await DELETE(request);
    expect(response.status).toBe(401);
  });

  it("disconnects and returns success", async () => {
    mockAuth("user-123");
    vi.mocked(disconnectPlatform).mockResolvedValue(undefined);
    const DELETE = await importDELETE();
    const request = new Request("http://localhost:3000/api/connections/twitter", {
      method: "DELETE",
    });
    const response = await DELETE(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(disconnectPlatform).toHaveBeenCalledWith("user-123", "twitter");
  });
});
