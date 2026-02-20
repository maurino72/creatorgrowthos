import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LinkedInAdapter, AnalyticsScopeError, hasAnalyticsScopes } from "./linkedin";

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

    it("includes all required scopes including analytics", () => {
      const result = adapter.getAuthUrl("state", "http://localhost/callback");
      const url = new URL(result.url);
      const scope = url.searchParams.get("scope")!;
      expect(scope).toContain("openid");
      expect(scope).toContain("profile");
      expect(scope).toContain("email");
      expect(scope).toContain("w_member_social");
      expect(scope).toContain("r_member_postAnalytics");
      expect(scope).toContain("r_member_profileAnalytics");
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

    it("prefixes raw platform_user_id with urn:li:person:", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(null, {
          status: 201,
          headers: { "x-restli-id": "urn:li:share:123456" },
        }),
      );

      await adapter.publishPost("token", {
        text: "Hello LinkedIn!",
        authorId: "VtqiECy_jt",
      });

      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(body.author).toBe("urn:li:person:VtqiECy_jt");
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

    it("prefixes raw authorId with urn:li:person: in owner field", async () => {
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
      fetchSpy.mockResolvedValueOnce(new Response(null, { status: 201 }));

      await adapter.uploadMedia("token", Buffer.from("fake"), "image/jpeg", {
        authorId: "VtqiECy_jt",
      });

      const initBody = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(initBody.initializeUploadRequest.owner).toBe("urn:li:person:VtqiECy_jt");
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

  // ─── Analytics Scope Detection ────────────────────────────────────────

  describe("hasAnalyticsScopes", () => {
    it("returns true when all analytics scopes are present", () => {
      expect(
        hasAnalyticsScopes([
          "openid",
          "profile",
          "email",
          "w_member_social",
          "r_member_postAnalytics",
          "r_member_profileAnalytics",
        ]),
      ).toBe(true);
    });

    it("returns false when r_member_postAnalytics is missing", () => {
      expect(
        hasAnalyticsScopes(["openid", "profile", "email", "w_member_social"]),
      ).toBe(false);
    });

    it("returns false when r_member_profileAnalytics is missing", () => {
      expect(
        hasAnalyticsScopes([
          "openid",
          "profile",
          "email",
          "w_member_social",
          "r_member_postAnalytics",
        ]),
      ).toBe(false);
    });

    it("returns false for null/undefined scopes", () => {
      expect(hasAnalyticsScopes(null)).toBe(false);
      expect(hasAnalyticsScopes(undefined)).toBe(false);
    });

    it("returns false for empty array", () => {
      expect(hasAnalyticsScopes([])).toBe(false);
    });
  });

  // ─── Post Analytics (memberCreatorPostAnalytics) ────────────────────

  describe("fetchPostAnalytics", () => {
    it("calls memberCreatorPostAnalytics for each metric type", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      // Mock 5 responses for 5 metric types
      const metricTypes = ["IMPRESSION", "MEMBERS_REACHED", "REACTION", "COMMENT", "RESHARE"];
      for (const metricType of metricTypes) {
        fetchSpy.mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              elements: [
                {
                  count: metricType === "IMPRESSION" ? 5000 : metricType === "MEMBERS_REACHED" ? 3500 : metricType === "REACTION" ? 89 : metricType === "COMMENT" ? 12 : 7,
                  metricType: {
                    "com.linkedin.adsexternalapi.memberanalytics.v1.CreatorPostAnalyticsMetricTypeV1": metricType,
                  },
                  targetEntity: { share: "urn:li:share:123" },
                },
              ],
              paging: { count: 10, start: 0, links: [] },
            }),
            { status: 200 },
          ),
        );
      }

      const result = await adapter.fetchPostAnalytics("token", "urn:li:share:123");

      expect(fetchSpy).toHaveBeenCalledTimes(5);
      expect(result.impressions).toBe(5000);
      expect(result.uniqueReach).toBe(3500);
      expect(result.reactions).toBe(89);
      expect(result.comments).toBe(12);
      expect(result.shares).toBe(7);
    });

    it("uses q=entity with URL-encoded share URN", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      for (let i = 0; i < 5; i++) {
        fetchSpy.mockResolvedValueOnce(
          new Response(
            JSON.stringify({ elements: [{ count: 0 }], paging: { count: 10, start: 0, links: [] } }),
            { status: 200 },
          ),
        );
      }

      await adapter.fetchPostAnalytics("token", "urn:li:share:123456");

      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain("memberCreatorPostAnalytics");
      expect(url).toContain("q=entity");
      expect(url).toContain("entity=(share:urn%3Ali%3Ashare%3A123456)");
    });

    it("includes correct headers (LinkedIn-Version 202506, X-Restli-Protocol-Version)", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      for (let i = 0; i < 5; i++) {
        fetchSpy.mockResolvedValueOnce(
          new Response(
            JSON.stringify({ elements: [{ count: 0 }], paging: { count: 10, start: 0, links: [] } }),
            { status: 200 },
          ),
        );
      }

      await adapter.fetchPostAnalytics("token", "urn:li:share:123");

      const headers = fetchSpy.mock.calls[0][1]?.headers as Record<string, string>;
      expect(headers["LinkedIn-Version"]).toBe("202601");
      expect(headers["X-Restli-Protocol-Version"]).toBe("2.0.0");
      expect(headers["Authorization"]).toBe("Bearer token");
    });

    it("returns zeros when elements array is empty", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      for (let i = 0; i < 5; i++) {
        fetchSpy.mockResolvedValueOnce(
          new Response(
            JSON.stringify({ elements: [], paging: { count: 10, start: 0, links: [] } }),
            { status: 200 },
          ),
        );
      }

      const result = await adapter.fetchPostAnalytics("token", "urn:li:share:123");
      expect(result.impressions).toBe(0);
      expect(result.uniqueReach).toBe(0);
      expect(result.reactions).toBe(0);
      expect(result.comments).toBe(0);
      expect(result.shares).toBe(0);
    });

    it("throws AnalyticsScopeError on 403", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Not enough permissions" }), { status: 403 }),
      );

      await expect(
        adapter.fetchPostAnalytics("token", "urn:li:share:123"),
      ).rejects.toThrow(AnalyticsScopeError);
    });

    it("throws generic error on other non-OK status", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Server error" }), { status: 500 }),
      );

      await expect(
        adapter.fetchPostAnalytics("token", "urn:li:share:123"),
      ).rejects.toThrow("Post analytics failed");
    });
  });

  describe("fetchAggregatedAnalytics", () => {
    it("uses q=me for aggregated metrics", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      for (let i = 0; i < 5; i++) {
        fetchSpy.mockResolvedValueOnce(
          new Response(
            JSON.stringify({ elements: [{ count: 100 }], paging: { count: 10, start: 0, links: [] } }),
            { status: 200 },
          ),
        );
      }

      await adapter.fetchAggregatedAnalytics("token");

      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain("q=me");
      expect(url).not.toContain("q=entity");
    });

    it("supports date range parameter", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      for (let i = 0; i < 5; i++) {
        fetchSpy.mockResolvedValueOnce(
          new Response(
            JSON.stringify({ elements: [{ count: 50 }], paging: { count: 10, start: 0, links: [] } }),
            { status: 200 },
          ),
        );
      }

      const start = new Date("2025-01-01");
      const end = new Date("2025-01-08");
      await adapter.fetchAggregatedAnalytics("token", { start, end });

      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain("dateRange=");
      expect(url).toContain("year:2025");
      expect(url).toContain("month:1");
      expect(url).toContain("day:1");
    });

    it("returns aggregated totals across metric types", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      const counts = [10000, 7500, 500, 80, 30];
      for (const count of counts) {
        fetchSpy.mockResolvedValueOnce(
          new Response(
            JSON.stringify({ elements: [{ count }], paging: { count: 10, start: 0, links: [] } }),
            { status: 200 },
          ),
        );
      }

      const result = await adapter.fetchAggregatedAnalytics("token");
      expect(result.impressions).toBe(10000);
      expect(result.uniqueReach).toBe(7500);
      expect(result.reactions).toBe(500);
      expect(result.comments).toBe(80);
      expect(result.shares).toBe(30);
    });
  });

  // ─── Video Analytics (memberCreatorVideoAnalytics) ──────────────────

  describe("fetchVideoAnalytics", () => {
    it("calls memberCreatorVideoAnalytics for 3 video metric types", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      // VIDEO_PLAY, VIDEO_WATCH_TIME, VIDEO_VIEWER
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify({ elements: [{ count: 7852 }], paging: { count: 10, start: 0, links: [] } }), { status: 200 }),
      );
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify({ elements: [{ count: 450000 }], paging: { count: 10, start: 0, links: [] } }), { status: 200 }),
      );
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify({ elements: [{ count: 3200 }], paging: { count: 10, start: 0, links: [] } }), { status: 200 }),
      );

      const result = await adapter.fetchVideoAnalytics("token", "urn:li:share:123");

      expect(fetchSpy).toHaveBeenCalledTimes(3);
      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain("memberCreatorVideoAnalytics");
      expect(result.videoPlays).toBe(7852);
      expect(result.videoWatchTimeMs).toBe(450000);
      expect(result.videoUniqueViewers).toBe(3200);
    });

    it("returns zeros when elements are empty (non-video post)", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      for (let i = 0; i < 3; i++) {
        fetchSpy.mockResolvedValueOnce(
          new Response(JSON.stringify({ elements: [], paging: { count: 10, start: 0, links: [] } }), { status: 200 }),
        );
      }

      const result = await adapter.fetchVideoAnalytics("token", "urn:li:share:123");
      expect(result.videoPlays).toBe(0);
      expect(result.videoWatchTimeMs).toBe(0);
      expect(result.videoUniqueViewers).toBe(0);
    });

    it("throws AnalyticsScopeError on 403", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Forbidden" }), { status: 403 }),
      );

      await expect(
        adapter.fetchVideoAnalytics("token", "urn:li:share:123"),
      ).rejects.toThrow(AnalyticsScopeError);
    });
  });

  // ─── Follower Statistics (memberFollowersCount) ────────────────────

  describe("fetchFollowerStats", () => {
    it("fetches lifetime follower count via q=me", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            elements: [{ memberFollowersCount: 4500 }],
            paging: { count: 10, start: 0, total: 1, links: [] },
          }),
          { status: 200 },
        ),
      );

      const result = await adapter.fetchFollowerStats("token");

      expect(result.followerCount).toBe(4500);
    });

    it("calls memberFollowersCount endpoint with correct headers", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            elements: [{ memberFollowersCount: 100 }],
            paging: { count: 10, start: 0, total: 1, links: [] },
          }),
          { status: 200 },
        ),
      );

      await adapter.fetchFollowerStats("token");

      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toContain("memberFollowersCount");
      expect(url).toContain("q=me");
      const headers = options?.headers as Record<string, string>;
      expect(headers["Authorization"]).toBe("Bearer token");
      expect(headers["LinkedIn-Version"]).toBe("202601");
    });

    it("returns 0 when elements are empty", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({ elements: [], paging: { count: 10, start: 0, total: 0, links: [] } }),
          { status: 200 },
        ),
      );

      const result = await adapter.fetchFollowerStats("token");
      expect(result.followerCount).toBe(0);
    });

    it("throws on non-OK response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Server error" }), { status: 500 }),
      );

      await expect(adapter.fetchFollowerStats("token")).rejects.toThrow(
        "Follower stats failed",
      );
    });
  });

  describe("fetchFollowerStatsDaily", () => {
    it("fetches daily follower counts for a date range", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            elements: [
              {
                memberFollowersCount: 2,
                dateRange: { start: { month: 5, year: 2024, day: 4 }, end: { month: 5, year: 2024, day: 5 } },
              },
              {
                memberFollowersCount: 4,
                dateRange: { start: { month: 5, year: 2024, day: 5 }, end: { month: 5, year: 2024, day: 6 } },
              },
            ],
            paging: { start: 0, count: 10, links: [], total: 2 },
          }),
          { status: 200 },
        ),
      );

      const start = new Date("2024-05-04");
      const end = new Date("2024-05-06");
      const result = await adapter.fetchFollowerStatsDaily("token", start, end);

      expect(result).toHaveLength(2);
      expect(result[0].newFollowers).toBe(2);
      expect(result[1].newFollowers).toBe(4);
    });

    it("uses q=dateRange in the URL", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({ elements: [], paging: { start: 0, count: 10, links: [], total: 0 } }),
          { status: 200 },
        ),
      );

      await adapter.fetchFollowerStatsDaily("token", new Date("2025-01-01"), new Date("2025-01-08"));

      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain("q=dateRange");
      expect(url).toContain("dateRange=");
      expect(url).toContain("year:2025");
    });
  });

  describe("AnalyticsScopeError", () => {
    it("is an instance of Error", () => {
      const err = new AnalyticsScopeError("missing scopes");
      expect(err).toBeInstanceOf(Error);
    });

    it("has the correct name", () => {
      const err = new AnalyticsScopeError("missing scopes");
      expect(err.name).toBe("AnalyticsScopeError");
    });

    it("preserves the message", () => {
      const err = new AnalyticsScopeError("LinkedIn analytics scopes not granted");
      expect(err.message).toBe("LinkedIn analytics scopes not granted");
    });
  });
});
