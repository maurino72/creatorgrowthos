import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TwitterAdapter } from "./twitter";

const MOCK_CLIENT_ID = "test-client-id";
const MOCK_CLIENT_SECRET = "test-client-secret";

describe("TwitterAdapter", () => {
  let adapter: TwitterAdapter;

  beforeEach(() => {
    vi.stubEnv("TWITTER_CLIENT_ID", MOCK_CLIENT_ID);
    vi.stubEnv("TWITTER_CLIENT_SECRET", MOCK_CLIENT_SECRET);
    adapter = new TwitterAdapter();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getAuthUrl", () => {
    it("returns a URL pointing to Twitter OAuth 2.0 authorize endpoint", () => {
      const result = adapter.getAuthUrl("test-state", "http://localhost:3000/api/connections/twitter/callback");
      expect(result.url).toContain("https://twitter.com/i/oauth2/authorize");
    });

    it("includes required OAuth params in the URL", () => {
      const result = adapter.getAuthUrl("test-state", "http://localhost:3000/callback");
      const url = new URL(result.url);
      expect(url.searchParams.get("response_type")).toBe("code");
      expect(url.searchParams.get("client_id")).toBe(MOCK_CLIENT_ID);
      expect(url.searchParams.get("redirect_uri")).toBe("http://localhost:3000/callback");
      expect(url.searchParams.get("state")).toBe("test-state");
      expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    });

    it("includes required scopes", () => {
      const result = adapter.getAuthUrl("state", "http://localhost/callback");
      const url = new URL(result.url);
      const scopes = url.searchParams.get("scope")!;
      expect(scopes).toContain("tweet.read");
      expect(scopes).toContain("tweet.write");
      expect(scopes).toContain("users.read");
      expect(scopes).toContain("offline.access");
    });

    it("includes a code_challenge derived from codeVerifier", () => {
      const result = adapter.getAuthUrl("state", "http://localhost/callback");
      const url = new URL(result.url);
      expect(url.searchParams.get("code_challenge")).toBeTruthy();
      expect(result.codeVerifier).toBeTruthy();
    });

    it("returns a codeVerifier in the result", () => {
      const result = adapter.getAuthUrl("state", "http://localhost/callback");
      expect(result.codeVerifier).toBeDefined();
      expect(typeof result.codeVerifier).toBe("string");
      expect(result.codeVerifier!.length).toBeGreaterThanOrEqual(43);
    });
  });

  describe("exchangeCodeForTokens", () => {
    it("sends correct request to Twitter token endpoint", async () => {
      const mockResponse = {
        access_token: "test-access-token",
        refresh_token: "test-refresh-token",
        expires_in: 7200,
        scope: "tweet.read tweet.write users.read offline.access",
        token_type: "bearer",
      };

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 }),
      );

      await adapter.exchangeCodeForTokens(
        "auth-code",
        "http://localhost:3000/callback",
        "code-verifier-123",
      );

      expect(fetchSpy).toHaveBeenCalledOnce();
      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toBe("https://api.x.com/2/oauth2/token");
      expect(options?.method).toBe("POST");

      // Basic auth header
      const expectedAuth = Buffer.from(`${MOCK_CLIENT_ID}:${MOCK_CLIENT_SECRET}`).toString("base64");
      expect(options?.headers).toEqual(
        expect.objectContaining({
          Authorization: `Basic ${expectedAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        }),
      );

      // Body params
      const body = new URLSearchParams(options?.body as string);
      expect(body.get("grant_type")).toBe("authorization_code");
      expect(body.get("code")).toBe("auth-code");
      expect(body.get("redirect_uri")).toBe("http://localhost:3000/callback");
      expect(body.get("code_verifier")).toBe("code-verifier-123");
    });

    it("returns parsed TokenPair from response", async () => {
      const mockResponse = {
        access_token: "access-123",
        refresh_token: "refresh-456",
        expires_in: 7200,
        scope: "tweet.read users.read",
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 }),
      );

      const result = await adapter.exchangeCodeForTokens("code", "http://localhost/cb", "verifier");
      expect(result.accessToken).toBe("access-123");
      expect(result.refreshToken).toBe("refresh-456");
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.scopes).toEqual(["tweet.read", "users.read"]);
    });

    it("throws on non-OK response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 }),
      );

      await expect(
        adapter.exchangeCodeForTokens("code", "http://localhost/cb", "verifier"),
      ).rejects.toThrow("Token exchange failed");
    });
  });

  describe("refreshTokens", () => {
    it("sends correct request to Twitter token endpoint", async () => {
      const mockResponse = {
        access_token: "new-access",
        refresh_token: "new-refresh",
        expires_in: 7200,
        scope: "tweet.read",
      };

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 }),
      );

      await adapter.refreshTokens("old-refresh-token");

      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toBe("https://api.x.com/2/oauth2/token");
      expect(options?.method).toBe("POST");

      const body = new URLSearchParams(options?.body as string);
      expect(body.get("grant_type")).toBe("refresh_token");
      expect(body.get("refresh_token")).toBe("old-refresh-token");
    });

    it("returns parsed TokenPair", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "new-access",
            refresh_token: "new-refresh",
            expires_in: 3600,
            scope: "tweet.read tweet.write",
          }),
          { status: 200 },
        ),
      );

      const result = await adapter.refreshTokens("old-refresh");
      expect(result.accessToken).toBe("new-access");
      expect(result.refreshToken).toBe("new-refresh");
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it("throws on non-OK response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 }),
      );

      await expect(adapter.refreshTokens("bad-token")).rejects.toThrow(
        "Token refresh failed",
      );
    });
  });

  describe("getCurrentUser", () => {
    it("fetches user from Twitter API with Bearer token", async () => {
      const mockResponse = {
        data: {
          id: "12345",
          username: "testuser",
          name: "Test User",
          profile_image_url: "https://pbs.twimg.com/photo.jpg",
        },
      };

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 }),
      );

      await adapter.getCurrentUser("access-token-123");

      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toBe("https://api.x.com/2/users/me?user.fields=profile_image_url");
      expect(options?.headers).toEqual(
        expect.objectContaining({
          Authorization: "Bearer access-token-123",
        }),
      );
    });

    it("returns parsed PlatformUserInfo", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "12345",
              username: "testuser",
              name: "Test User",
              profile_image_url: "https://pbs.twimg.com/photo.jpg",
            },
          }),
          { status: 200 },
        ),
      );

      const result = await adapter.getCurrentUser("token");
      expect(result.platformUserId).toBe("12345");
      expect(result.username).toBe("testuser");
      expect(result.displayName).toBe("Test User");
      expect(result.avatarUrl).toBe("https://pbs.twimg.com/photo.jpg");
    });

    it("throws on non-OK response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 }),
      );

      await expect(adapter.getCurrentUser("bad-token")).rejects.toThrow(
        "Failed to fetch current user",
      );
    });
  });
});
