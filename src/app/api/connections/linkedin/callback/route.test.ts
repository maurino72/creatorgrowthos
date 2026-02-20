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

vi.mock("@/lib/inngest/send", () => ({
  sendConnectionCreated: vi.fn().mockResolvedValue(undefined),
}));

import { createClient } from "@/lib/supabase/server";
import { getAdapterForPlatform } from "@/lib/adapters";
import { decrypt } from "@/lib/utils/encryption";
import { upsertConnection } from "@/lib/services/connections";

describe("GET /api/connections/linkedin/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
  });

  async function importGET() {
    const mod = await import("./route");
    return mod.GET;
  }

  function mockAuth(
    userId: string | null,
    profile?: { onboarded_at: string | null } | null,
  ) {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: userId ? { id: userId } : null },
          error: userId ? null : { message: "No session" },
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: profile ?? null,
              error: profile
                ? null
                : { code: "PGRST116", message: "Not found" },
            }),
          }),
        }),
      }),
    };
    vi.mocked(createClient).mockResolvedValue(supabase as never);
    return supabase;
  }

  function mockAdapter(overrides: Record<string, unknown> = {}) {
    const adapter = {
      exchangeCodeForTokens: vi.fn().mockResolvedValue({
        accessToken: "li-access-123",
        refreshToken: "li-refresh-456",
        expiresAt: new Date("2024-12-01"),
        scopes: ["openid", "profile", "email", "w_member_social"],
      }),
      getCurrentUser: vi.fn().mockResolvedValue({
        platformUserId: "li-user-123",
        username: "John Doe",
        displayName: "John Doe",
        avatarUrl: "https://media.licdn.com/photo.jpg",
      }),
      ...overrides,
    };
    vi.mocked(getAdapterForPlatform).mockReturnValue(adapter as never);
    return adapter;
  }

  function makeCallbackUrl(params: Record<string, string>) {
    const url = new URL("http://localhost:3000/api/connections/linkedin/callback");
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return url.toString();
  }

  function makeRequestWithCookie(url: string, cookieValue: string) {
    return new Request(url, {
      headers: { cookie: `linkedin_oauth=${cookieValue}` },
    });
  }

  it("redirects with error when access_denied", async () => {
    mockAuth("user-123");
    const GET = await importGET();
    const request = new Request(makeCallbackUrl({ error: "access_denied" }));
    const response = await GET(request);
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain("error=access_denied");
  });

  it("redirects with session_expired when no user", async () => {
    mockAuth(null);
    const GET = await importGET();
    const request = new Request(
      makeCallbackUrl({ code: "test", state: "test" }),
    );
    const response = await GET(request);
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain("error=session_expired");
  });

  it("redirects with session_expired when cookie missing", async () => {
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
      redirectUri: "http://localhost:3000/api/connections/linkedin/callback",
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
      redirectUri: "http://localhost:3000/api/connections/linkedin/callback",
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

  it("completes OAuth flow and redirects to connections page (no PKCE)", async () => {
    mockAuth("user-123", { onboarded_at: "2024-01-01" });
    const cookiePayload = JSON.stringify({
      state: "valid-state",
      redirectUri: "http://localhost:3000/api/connections/linkedin/callback",
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
      "/connections?connected=linkedin",
    );

    // Token exchange called WITHOUT codeVerifier (no PKCE)
    expect(adapter.exchangeCodeForTokens).toHaveBeenCalledWith(
      "auth-code",
      "http://localhost:3000/api/connections/linkedin/callback",
      undefined,
    );

    expect(adapter.getCurrentUser).toHaveBeenCalledWith("li-access-123");

    expect(upsertConnection).toHaveBeenCalledWith("user-123", {
      platform: "linkedin",
      platformUserId: "li-user-123",
      platformUsername: "John Doe",
      accessToken: "li-access-123",
      refreshToken: "li-refresh-456",
      expiresAt: expect.any(Date),
      scopes: ["openid", "profile", "email", "w_member_social"],
    });

    // Cookie cleared
    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain("linkedin_oauth=");
    expect(setCookie).toContain("Max-Age=0");
  });

  it("redirects non-onboarded user to /onboarding?connected=linkedin", async () => {
    mockAuth("user-123", { onboarded_at: null });
    const cookiePayload = JSON.stringify({
      state: "valid-state",
      redirectUri: "http://localhost:3000/api/connections/linkedin/callback",
    });
    vi.mocked(decrypt).mockReturnValue(cookiePayload);
    mockAdapter();
    vi.mocked(upsertConnection).mockResolvedValue(undefined);

    const GET = await importGET();
    const request = makeRequestWithCookie(
      makeCallbackUrl({ code: "auth-code", state: "valid-state" }),
      "encrypted-cookie",
    );
    const response = await GET(request);

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain(
      "/onboarding?connected=linkedin",
    );
  });
});
