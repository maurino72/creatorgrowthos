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

  describe("fetchPostMetrics", () => {
    it("fetches tweet with metrics fields using Bearer token", async () => {
      const mockResponse = {
        data: {
          id: "tweet-123",
          public_metrics: {
            impression_count: 1500,
            like_count: 42,
            reply_count: 7,
            retweet_count: 12,
          },
          non_public_metrics: {
            url_link_clicks: 25,
            user_profile_clicks: 8,
          },
        },
      };

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 }),
      );

      await adapter.fetchPostMetrics("access-token-123", "tweet-123");

      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toContain("https://api.x.com/2/tweets/tweet-123");
      const parsed = new URL(url as string);
      expect(parsed.searchParams.get("tweet.fields")).toBe("public_metrics,non_public_metrics,organic_metrics");
      expect(options?.headers).toEqual(
        expect.objectContaining({
          Authorization: "Bearer access-token-123",
        }),
      );
    });

    it("returns mapped RawMetricSnapshot from full response", async () => {
      const mockResponse = {
        data: {
          id: "tweet-123",
          public_metrics: {
            impression_count: 1500,
            like_count: 42,
            reply_count: 7,
            retweet_count: 12,
          },
          non_public_metrics: {
            url_link_clicks: 25,
            user_profile_clicks: 8,
          },
        },
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 }),
      );

      const result = await adapter.fetchPostMetrics("token", "tweet-123");
      expect(result.impressions).toBe(1500);
      expect(result.likes).toBe(42);
      expect(result.replies).toBe(7);
      expect(result.reposts).toBe(12);
      expect(result.clicks).toBe(25);
      expect(result.profileVisits).toBe(8);
      expect(result.observedAt).toBeInstanceOf(Date);
    });

    it("handles missing non_public_metrics gracefully", async () => {
      const mockResponse = {
        data: {
          id: "tweet-123",
          public_metrics: {
            impression_count: 500,
            like_count: 10,
            reply_count: 2,
            retweet_count: 3,
          },
        },
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 }),
      );

      const result = await adapter.fetchPostMetrics("token", "tweet-123");
      expect(result.impressions).toBe(500);
      expect(result.likes).toBe(10);
      expect(result.replies).toBe(2);
      expect(result.reposts).toBe(3);
      expect(result.clicks).toBeUndefined();
      expect(result.profileVisits).toBeUndefined();
    });

    it("throws on non-OK response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: "Not Found" }), { status: 404 }),
      );

      await expect(
        adapter.fetchPostMetrics("token", "nonexistent-id"),
      ).rejects.toThrow("Fetch metrics failed");
    });

    it("throws on rate limit (429) response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: "Too Many Requests" }), { status: 429 }),
      );

      await expect(
        adapter.fetchPostMetrics("token", "tweet-123"),
      ).rejects.toThrow("Fetch metrics failed");
    });
  });

  describe("uploadMedia", () => {
    it("uploads media via INIT, APPEND, FINALIZE and returns media_id", async () => {
      const imageBuffer = Buffer.from("fake-image-data");
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      // INIT response
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ media_id_string: "media-123" }),
          { status: 200 },
        ),
      );

      // APPEND response (empty 204)
      fetchSpy.mockResolvedValueOnce(
        new Response(null, { status: 204 }),
      );

      // FINALIZE response
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ media_id_string: "media-123" }),
          { status: 200 },
        ),
      );

      const mediaId = await adapter.uploadMedia("access-token", imageBuffer, "image/jpeg");

      expect(mediaId).toBe("media-123");
      expect(fetchSpy).toHaveBeenCalledTimes(3);

      // INIT call
      const initCall = fetchSpy.mock.calls[0];
      expect(initCall[0]).toContain("upload.twitter.com");
      const initBody = initCall[1]?.body as URLSearchParams;
      expect(initBody.get("command")).toBe("INIT");
      expect(initBody.get("media_type")).toBe("image/jpeg");
      expect(initBody.get("total_bytes")).toBe(String(imageBuffer.length));
    });

    it("throws on INIT failure", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Invalid media" }), { status: 400 }),
      );

      await expect(
        adapter.uploadMedia("token", Buffer.from("data"), "image/jpeg"),
      ).rejects.toThrow("Media INIT failed");
    });

    it("throws on APPEND failure", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify({ media_id_string: "media-123" }), { status: 200 }),
      );
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Upload error" }), { status: 400 }),
      );

      await expect(
        adapter.uploadMedia("token", Buffer.from("data"), "image/jpeg"),
      ).rejects.toThrow("Media APPEND failed");
    });

    it("throws on FINALIZE failure", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify({ media_id_string: "media-123" }), { status: 200 }),
      );
      fetchSpy.mockResolvedValueOnce(
        new Response(null, { status: 204 }),
      );
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Processing error" }), { status: 400 }),
      );

      await expect(
        adapter.uploadMedia("token", Buffer.from("data"), "image/jpeg"),
      ).rejects.toThrow("Media FINALIZE failed");
    });
  });

  describe("fetchUserTweets", () => {
    it("fetches user tweets with public_metrics and created_at", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              {
                id: "tweet-1",
                text: "Hello world",
                created_at: "2024-01-15T10:30:00.000Z",
                public_metrics: {
                  impression_count: 100,
                  like_count: 5,
                  reply_count: 1,
                  retweet_count: 2,
                },
              },
              {
                id: "tweet-2",
                text: "Second tweet",
                created_at: "2024-01-14T08:00:00.000Z",
                public_metrics: {
                  impression_count: 50,
                  like_count: 3,
                  reply_count: 0,
                  retweet_count: 1,
                },
              },
            ],
            meta: { result_count: 2 },
          }),
          { status: 200 },
        ),
      );

      const result = await adapter.fetchUserTweets("token", "user-id-1", 50);
      expect(result.tweets).toHaveLength(2);
      expect(result.tweets[0].id).toBe("tweet-1");
      expect(result.tweets[0].text).toBe("Hello world");
      expect(result.tweets[0].created_at).toBe("2024-01-15T10:30:00.000Z");
      expect(result.tweets[0].public_metrics.impression_count).toBe(100);
    });

    it("paginates when there is a next_token", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      // First page
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [{ id: "t-1", text: "A", created_at: "2024-01-15T00:00:00Z", public_metrics: { impression_count: 0, like_count: 0, reply_count: 0, retweet_count: 0 } }],
            meta: { result_count: 1, next_token: "page2-token" },
          }),
          { status: 200 },
        ),
      );
      // Second page
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [{ id: "t-2", text: "B", created_at: "2024-01-14T00:00:00Z", public_metrics: { impression_count: 0, like_count: 0, reply_count: 0, retweet_count: 0 } }],
            meta: { result_count: 1 },
          }),
          { status: 200 },
        ),
      );

      const result = await adapter.fetchUserTweets("token", "user-id-1", 200);
      expect(result.tweets).toHaveLength(2);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      // Second call should include pagination_token
      const secondUrl = fetchSpy.mock.calls[1][0] as string;
      expect(secondUrl).toContain("pagination_token=page2-token");
    });

    it("returns empty array when user has no tweets", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({ meta: { result_count: 0 } }),
          { status: 200 },
        ),
      );

      const result = await adapter.fetchUserTweets("token", "user-id-1", 50);
      expect(result.tweets).toHaveLength(0);
    });

    it("throws on API error", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({ detail: "Unauthorized" }),
          { status: 401 },
        ),
      );

      await expect(
        adapter.fetchUserTweets("token", "user-id-1", 50),
      ).rejects.toThrow("Fetch user tweets failed");
    });

    it("stops fetching when max count is reached", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      // Return 100 tweets with next_token
      const tweets = Array.from({ length: 100 }, (_, i) => ({
        id: `t-${i}`,
        text: `Tweet ${i}`,
        created_at: "2024-01-15T00:00:00Z",
        public_metrics: { impression_count: 0, like_count: 0, reply_count: 0, retweet_count: 0 },
      }));
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: tweets, meta: { result_count: 100, next_token: "more" } }),
          { status: 200 },
        ),
      );

      // Request only 50
      const result = await adapter.fetchUserTweets("token", "user-id-1", 50);
      expect(result.tweets.length).toBeLessThanOrEqual(50);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("publishPost with media", () => {
    it("includes media.media_ids when mediaIds provided", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: { id: "tweet-1", text: "Hello" } }),
          { status: 201 },
        ),
      );

      await adapter.publishPost("token", {
        text: "Hello with image",
        mediaIds: ["media-123", "media-456"],
      });

      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(body.media).toEqual({ media_ids: ["media-123", "media-456"] });
    });

    it("does not include media field when no mediaIds", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: { id: "tweet-1", text: "Hello" } }),
          { status: 201 },
        ),
      );

      await adapter.publishPost("token", { text: "Hello text only" });

      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(body.media).toBeUndefined();
    });
  });
});
