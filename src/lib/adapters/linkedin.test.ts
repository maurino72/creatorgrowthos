import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LinkedInAdapter } from "./linkedin";

const MOCK_CLIENT_ID = "li-client-id";
const MOCK_CLIENT_SECRET = "li-client-secret";

describe("LinkedInAdapter", () => {
  let adapter: LinkedInAdapter;

  beforeEach(() => {
    vi.stubEnv("LINKEDIN_CLIENT_ID", MOCK_CLIENT_ID);
    vi.stubEnv("LINKEDIN_CLIENT_SECRET", MOCK_CLIENT_SECRET);
    adapter = new LinkedInAdapter();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── OAuth ────────────────────────────────────────────────────────────

  describe("getAuthUrl", () => {
    it("returns a URL pointing to LinkedIn OAuth authorize endpoint", () => {
      const result = adapter.getAuthUrl("test-state", "http://localhost:3000/api/connections/linkedin/callback");
      expect(result.url).toContain("https://www.linkedin.com/oauth/v2/authorization");
    });

    it("includes required OAuth params in the URL", () => {
      const result = adapter.getAuthUrl("test-state", "http://localhost:3000/callback");
      const url = new URL(result.url);
      expect(url.searchParams.get("response_type")).toBe("code");
      expect(url.searchParams.get("client_id")).toBe(MOCK_CLIENT_ID);
      expect(url.searchParams.get("redirect_uri")).toBe("http://localhost:3000/callback");
      expect(url.searchParams.get("state")).toBe("test-state");
    });

    it("includes required scopes (openid profile email w_member_social)", () => {
      const result = adapter.getAuthUrl("state", "http://localhost/callback");
      const url = new URL(result.url);
      const scope = url.searchParams.get("scope")!;
      expect(scope).toContain("openid");
      expect(scope).toContain("profile");
      expect(scope).toContain("email");
      expect(scope).toContain("w_member_social");
    });

    it("does NOT include PKCE params (no code_challenge)", () => {
      const result = adapter.getAuthUrl("state", "http://localhost/callback");
      const url = new URL(result.url);
      expect(url.searchParams.get("code_challenge")).toBeNull();
      expect(url.searchParams.get("code_challenge_method")).toBeNull();
    });

    it("returns undefined codeVerifier (no PKCE)", () => {
      const result = adapter.getAuthUrl("state", "http://localhost/callback");
      expect(result.codeVerifier).toBeUndefined();
    });
  });

  describe("exchangeCodeForTokens", () => {
    it("sends client_id and client_secret in the request body (not Basic auth)", async () => {
      const mockResponse = {
        access_token: "li-access-token",
        refresh_token: "li-refresh-token",
        expires_in: 5184000,
        scope: "openid profile email w_member_social",
      };

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 }),
      );

      await adapter.exchangeCodeForTokens(
        "auth-code",
        "http://localhost:3000/callback",
        undefined,
      );

      expect(fetchSpy).toHaveBeenCalledOnce();
      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toBe("https://www.linkedin.com/oauth/v2/accessToken");
      expect(options?.method).toBe("POST");

      // No Authorization header (LinkedIn uses body params)
      expect(options?.headers).not.toHaveProperty("Authorization");

      // Body params
      const body = new URLSearchParams(options?.body as string);
      expect(body.get("grant_type")).toBe("authorization_code");
      expect(body.get("code")).toBe("auth-code");
      expect(body.get("redirect_uri")).toBe("http://localhost:3000/callback");
      expect(body.get("client_id")).toBe(MOCK_CLIENT_ID);
      expect(body.get("client_secret")).toBe(MOCK_CLIENT_SECRET);
    });

    it("returns parsed TokenPair from response", async () => {
      const mockResponse = {
        access_token: "access-123",
        refresh_token: "refresh-456",
        expires_in: 5184000,
        scope: "openid profile email w_member_social",
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 }),
      );

      const result = await adapter.exchangeCodeForTokens("code", "http://localhost/cb");
      expect(result.accessToken).toBe("access-123");
      expect(result.refreshToken).toBe("refresh-456");
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.scopes).toEqual(["openid", "profile", "email", "w_member_social"]);
    });

    it("throws on non-OK response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 }),
      );

      await expect(
        adapter.exchangeCodeForTokens("code", "http://localhost/cb"),
      ).rejects.toThrow("Token exchange failed");
    });
  });

  describe("refreshTokens", () => {
    it("sends client credentials in body", async () => {
      const mockResponse = {
        access_token: "new-access",
        refresh_token: "new-refresh",
        expires_in: 5184000,
        scope: "openid profile",
      };

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 }),
      );

      await adapter.refreshTokens("old-refresh-token");

      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toBe("https://www.linkedin.com/oauth/v2/accessToken");

      const body = new URLSearchParams(options?.body as string);
      expect(body.get("grant_type")).toBe("refresh_token");
      expect(body.get("refresh_token")).toBe("old-refresh-token");
      expect(body.get("client_id")).toBe(MOCK_CLIENT_ID);
      expect(body.get("client_secret")).toBe(MOCK_CLIENT_SECRET);
    });

    it("returns parsed TokenPair", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "new-access",
            refresh_token: "new-refresh",
            expires_in: 5184000,
            scope: "openid profile",
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
    it("fetches user info from LinkedIn userinfo endpoint", async () => {
      const mockResponse = {
        sub: "li-user-123",
        name: "John Doe",
        email: "john@example.com",
        picture: "https://media.licdn.com/photo.jpg",
      };

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 }),
      );

      await adapter.getCurrentUser("access-token-123");

      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toBe("https://api.linkedin.com/v2/userinfo");
      expect(options?.headers).toEqual(
        expect.objectContaining({
          Authorization: "Bearer access-token-123",
        }),
      );
    });

    it("returns mapped PlatformUserInfo (sub → platformUserId, name → username)", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            sub: "li-user-123",
            name: "John Doe",
            email: "john@example.com",
            picture: "https://media.licdn.com/photo.jpg",
          }),
          { status: 200 },
        ),
      );

      const result = await adapter.getCurrentUser("token");
      expect(result.platformUserId).toBe("li-user-123");
      expect(result.username).toBe("John Doe");
      expect(result.displayName).toBe("John Doe");
      expect(result.avatarUrl).toBe("https://media.licdn.com/photo.jpg");
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

  // ─── Publishing ───────────────────────────────────────────────────────

  describe("publishPost", () => {
    it("sends correct payload to LinkedIn REST posts API", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(null, {
          status: 201,
          headers: { "x-restli-id": "urn:li:share:123456" },
        }),
      );

      await adapter.publishPost("token", {
        text: "Hello LinkedIn!",
        authorId: "urn:li:person:abc",
      });

      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toBe("https://api.linkedin.com/rest/posts");
      expect(options?.method).toBe("POST");

      // Required versioning headers
      const headers = options?.headers as Record<string, string>;
      expect(headers["LinkedIn-Version"]).toBe("202601");
      expect(headers["X-Restli-Protocol-Version"]).toBe("2.0.0");

      const body = JSON.parse(options?.body as string);
      expect(body.author).toBe("urn:li:person:abc");
      expect(body.commentary).toBe("Hello LinkedIn!");
      expect(body.visibility).toBe("PUBLIC");
      expect(body.lifecycleState).toBe("PUBLISHED");
      expect(body.distribution.feedDistribution).toBe("MAIN_FEED");
    });

    it("returns platformPostId from x-restli-id header", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(null, {
          status: 201,
          headers: { "x-restli-id": "urn:li:share:789" },
        }),
      );

      const result = await adapter.publishPost("token", {
        text: "Test",
        authorId: "urn:li:person:abc",
      });

      expect(result.platformPostId).toBe("urn:li:share:789");
      expect(result.platformUrl).toContain("linkedin.com");
      expect(result.publishedAt).toBeInstanceOf(Date);
    });

    it("includes single image in content when one mediaId provided", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(null, {
          status: 201,
          headers: { "x-restli-id": "urn:li:share:123" },
        }),
      );

      await adapter.publishPost("token", {
        text: "Post with image",
        authorId: "urn:li:person:abc",
        mediaIds: ["urn:li:image:img1"],
      });

      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(body.content.media.id).toBe("urn:li:image:img1");
    });

    it("includes multiImage content when multiple mediaIds provided", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(null, {
          status: 201,
          headers: { "x-restli-id": "urn:li:share:123" },
        }),
      );

      await adapter.publishPost("token", {
        text: "Post with images",
        authorId: "urn:li:person:abc",
        mediaIds: ["urn:li:image:img1", "urn:li:image:img2"],
      });

      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(body.content.multiImage.images).toHaveLength(2);
      expect(body.content.multiImage.images[0].id).toBe("urn:li:image:img1");
      expect(body.content.multiImage.images[1].id).toBe("urn:li:image:img2");
    });

    it("throws on non-OK response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Forbidden" }), { status: 403 }),
      );

      await expect(
        adapter.publishPost("token", { text: "Test", authorId: "urn:li:person:abc" }),
      ).rejects.toThrow("Publish failed");
    });
  });

  describe("uploadMedia", () => {
    it("initializes upload and PUTs binary data", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      // initializeUpload response
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            value: {
              uploadUrl: "https://api.linkedin.com/mediaUpload/abc",
              image: "urn:li:image:img-123",
            },
          }),
          { status: 200 },
        ),
      );

      // PUT binary response
      fetchSpy.mockResolvedValueOnce(new Response(null, { status: 201 }));

      const buffer = Buffer.from("fake-image");
      const result = await adapter.uploadMedia("token", buffer, "image/jpeg", {
        authorId: "urn:li:person:abc",
      });

      expect(result).toBe("urn:li:image:img-123");
      expect(fetchSpy).toHaveBeenCalledTimes(2);

      // Verify init call
      const [initUrl, initOpts] = fetchSpy.mock.calls[0];
      expect(initUrl).toBe("https://api.linkedin.com/rest/images?action=initializeUpload");
      const initHeaders = initOpts?.headers as Record<string, string>;
      expect(initHeaders["LinkedIn-Version"]).toBe("202601");
      const initBody = JSON.parse(initOpts?.body as string);
      expect(initBody.initializeUploadRequest.owner).toBe("urn:li:person:abc");

      // Verify PUT call
      const [putUrl, putOpts] = fetchSpy.mock.calls[1];
      expect(putUrl).toBe("https://api.linkedin.com/mediaUpload/abc");
      expect(putOpts?.method).toBe("PUT");
    });

    it("throws on init failure", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Error" }), { status: 400 }),
      );

      await expect(
        adapter.uploadMedia("token", Buffer.from("data"), "image/jpeg", {
          authorId: "urn:li:person:abc",
        }),
      ).rejects.toThrow("Image upload init failed");
    });

    it("throws on PUT failure", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            value: {
              uploadUrl: "https://api.linkedin.com/mediaUpload/abc",
              image: "urn:li:image:img-123",
            },
          }),
          { status: 200 },
        ),
      );
      fetchSpy.mockResolvedValueOnce(
        new Response(null, { status: 400 }),
      );

      await expect(
        adapter.uploadMedia("token", Buffer.from("data"), "image/jpeg", {
          authorId: "urn:li:person:abc",
        }),
      ).rejects.toThrow("Image upload PUT failed");
    });
  });

  describe("deletePost", () => {
    it("sends DELETE with URL-encoded URN", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(null, { status: 204 }),
      );

      await adapter.deletePost("token", "urn:li:share:123456");

      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toBe(
        "https://api.linkedin.com/rest/posts/urn%3Ali%3Ashare%3A123456",
      );
      expect(options?.method).toBe("DELETE");
      const headers = options?.headers as Record<string, string>;
      expect(headers["LinkedIn-Version"]).toBe("202601");
    });

    it("throws on non-OK response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Not Found" }), { status: 404 }),
      );

      await expect(
        adapter.deletePost("token", "urn:li:share:123456"),
      ).rejects.toThrow("Delete failed");
    });
  });

  // ─── Metrics ──────────────────────────────────────────────────────────

  describe("fetchPostMetrics", () => {
    it("fetches social metadata with URL-encoded URN", async () => {
      const mockResponse = {
        reactionSummaries: [
          { reactionType: "LIKE", count: 42 },
        ],
        commentSummary: { count: 7 },
        shareSummary: { count: 3 },
      };

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 }),
      );

      await adapter.fetchPostMetrics("token", "urn:li:share:123456");

      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toBe(
        "https://api.linkedin.com/rest/socialMetadata/urn%3Ali%3Ashare%3A123456",
      );
      const headers = options?.headers as Record<string, string>;
      expect(headers["LinkedIn-Version"]).toBe("202601");
      expect(headers["X-Restli-Protocol-Version"]).toBe("2.0.0");
    });

    it("maps LinkedIn metrics to RawMetricSnapshot", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            reactionSummaries: [
              { reactionType: "LIKE", count: 42 },
              { reactionType: "CELEBRATE", count: 5 },
            ],
            commentSummary: { count: 7 },
            shareSummary: { count: 3 },
          }),
          { status: 200 },
        ),
      );

      const result = await adapter.fetchPostMetrics("token", "urn:li:share:123");
      expect(result.likes).toBe(42);
      expect(result.replies).toBe(7);
      expect(result.reposts).toBe(3);
      expect(result.impressions).toBeUndefined();
      expect(result.clicks).toBeUndefined();
      expect(result.profileVisits).toBeUndefined();
      expect(result.observedAt).toBeInstanceOf(Date);
    });

    it("handles missing reactionSummaries gracefully", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            commentSummary: { count: 2 },
            shareSummary: { count: 0 },
          }),
          { status: 200 },
        ),
      );

      const result = await adapter.fetchPostMetrics("token", "urn:li:share:123");
      expect(result.likes).toBe(0);
      expect(result.replies).toBe(2);
      expect(result.reposts).toBe(0);
    });

    it("throws on non-OK response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Not Found" }), { status: 404 }),
      );

      await expect(
        adapter.fetchPostMetrics("token", "urn:li:share:nonexistent"),
      ).rejects.toThrow("Fetch metrics failed");
    });
  });
});
