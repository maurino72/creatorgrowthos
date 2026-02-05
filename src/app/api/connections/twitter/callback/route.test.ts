import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/adapters", () => ({
  getAdapterForPlatform: vi.fn(),
}));

vi.mock("@/lib/utils/encryption", () => ({
  encrypt: vi.fn((val: string) => `encrypted:${val}`),
  decrypt: vi.fn((val: string) => val.replace("encrypted:", "")),
}));

vi.mock("@/lib/services/connections", () => ({
  upsertConnection: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { getAdapterForPlatform } from "@/lib/adapters";
import { decrypt } from "@/lib/utils/encryption";
import { upsertConnection } from "@/lib/services/connections";

describe("GET /api/connections/twitter/callback", () => {
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

  function mockAdapter(overrides: Record<string, unknown> = {}) {
    const adapter = {
      exchangeCodeForTokens: vi.fn().mockResolvedValue({
        accessToken: "access-123",
        refreshToken: "refresh-456",
        expiresAt: new Date("2024-12-01"),
        scopes: ["tweet.read", "tweet.write"],
      }),
      getCurrentUser: vi.fn().mockResolvedValue({
        platformUserId: "tw-123",
        username: "testuser",
        displayName: "Test User",
        avatarUrl: "https://pbs.twimg.com/photo.jpg",
      }),
      ...overrides,
    };
    vi.mocked(getAdapterForPlatform).mockReturnValue(adapter as never);
    return adapter;
  }

  function makeCallbackUrl(params: Record<string, string>) {
    const url = new URL("http://localhost:3000/api/connections/twitter/callback");
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return url.toString();
  }

  function makeRequestWithCookie(url: string, cookieValue: string) {
    return new Request(url, {
      headers: { cookie: `twitter_oauth=${cookieValue}` },
    });
  }

  it("redirects with error when access_denied", async () => {
    mockAuth("user-123");
    const GET = await importGET();
    const request = new Request(
      makeCallbackUrl({ error: "access_denied" }),
    );
    const response = await GET(request);
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain("error=access_denied");
  });

  it("redirects with error when cookie is missing", async () => {
    mockAuth("user-123");
    const GET = await importGET();
    const request = new Request(
      makeCallbackUrl({ code: "test-code", state: "test-state" }),
    );
    const response = await GET(request);
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain("error=session_expired");
  });

  it("redirects with error on state mismatch", async () => {
    mockAuth("user-123");
    const cookiePayload = JSON.stringify({
      state: "correct-state",
      codeVerifier: "verifier-123",
    });
    vi.mocked(decrypt).mockReturnValue(cookiePayload);

    const GET = await importGET();
    const request = makeRequestWithCookie(
      makeCallbackUrl({ code: "test-code", state: "wrong-state" }),
      "encrypted-cookie",
    );
    const response = await GET(request);
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain("error=invalid_state");
  });

  it("redirects with error when token exchange fails", async () => {
    mockAuth("user-123");
    const cookiePayload = JSON.stringify({
      state: "valid-state",
      codeVerifier: "verifier-123",
    });
    vi.mocked(decrypt).mockReturnValue(cookiePayload);
    mockAdapter({
      exchangeCodeForTokens: vi.fn().mockRejectedValue(new Error("Token exchange failed")),
    });

    const GET = await importGET();
    const request = makeRequestWithCookie(
      makeCallbackUrl({ code: "test-code", state: "valid-state" }),
      "encrypted-cookie",
    );
    const response = await GET(request);
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain("error=token_exchange_failed");
  });

  it("completes OAuth flow and redirects to connections page on success", async () => {
    mockAuth("user-123");
    const cookiePayload = JSON.stringify({
      state: "valid-state",
      codeVerifier: "verifier-123",
    });
    vi.mocked(decrypt).mockReturnValue(cookiePayload);
    const adapter = mockAdapter();
    vi.mocked(upsertConnection).mockResolvedValue(undefined);

    const GET = await importGET();
    const request = makeRequestWithCookie(
      makeCallbackUrl({ code: "auth-code", state: "valid-state" }),
      "encrypted-cookie",
    );
    const response = await GET(request);

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain(
      "/dashboard/connections?connected=twitter",
    );

    // Verify token exchange was called correctly
    expect(adapter.exchangeCodeForTokens).toHaveBeenCalledWith(
      "auth-code",
      expect.stringContaining("/api/connections/twitter/callback"),
      "verifier-123",
    );

    // Verify user info was fetched
    expect(adapter.getCurrentUser).toHaveBeenCalledWith("access-123");

    // Verify connection was upserted
    expect(upsertConnection).toHaveBeenCalledWith("user-123", {
      platform: "twitter",
      platformUserId: "tw-123",
      platformUsername: "testuser",
      accessToken: "access-123",
      refreshToken: "refresh-456",
      expiresAt: expect.any(Date),
      scopes: ["tweet.read", "tweet.write"],
    });

    // Verify cookie is cleared
    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain("twitter_oauth=");
    expect(setCookie).toContain("Max-Age=0");
  });
});
