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
    it("uploads media via v2 INIT, APPEND, FINALIZE and returns media_id", async () => {
      const imageBuffer = Buffer.from("fake-image-data");
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      // INIT response (v2 format)
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ id: "media-123" }),
          { status: 200 },
        ),
      );

      // APPEND response (empty 204)
      fetchSpy.mockResolvedValueOnce(
        new Response(null, { status: 204 }),
      );

      // FINALIZE response (v2 format)
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ id: "media-123" }),
          { status: 200 },
        ),
      );

      const mediaId = await adapter.uploadMedia("access-token", imageBuffer, "image/jpeg");

      expect(mediaId).toBe("media-123");
      expect(fetchSpy).toHaveBeenCalledTimes(3);

      // INIT call uses v2 URL
      const initCall = fetchSpy.mock.calls[0];
      expect(initCall[0]).toContain("api.x.com/2/media/upload");
      const initBody = JSON.parse(initCall[1]?.body as string);
      expect(initBody.media_type).toBe("image/jpeg");
      expect(initBody.total_bytes).toBe(imageBuffer.length);
      expect(initBody.media_category).toBe("tweet_image");
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
        new Response(JSON.stringify({ id: "media-123" }), { status: 200 }),
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
        new Response(JSON.stringify({ id: "media-123" }), { status: 200 }),
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

  describe("getAuthUrl scopes", () => {
    it("includes media.write scope", () => {
      const result = adapter.getAuthUrl("state", "http://localhost/callback");
      const url = new URL(result.url);
      const scopes = url.searchParams.get("scope")!;
      expect(scopes).toContain("media.write");
    });
  });

  describe("uploadVideo", () => {
    it("uploads video in 5MB chunks with async processing", async () => {
      // Create a 6MB buffer (will need 2 chunks)
      const videoBuffer = Buffer.alloc(6 * 1024 * 1024);
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      // INIT
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "video-media-123" }), { status: 200 }),
      );

      // APPEND chunk 0
      fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }));

      // APPEND chunk 1
      fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }));

      // FINALIZE — returns processing_info
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "video-media-123",
            processing_info: { state: "pending", check_after_secs: 1 },
          }),
          { status: 200 },
        ),
      );

      // STATUS check — in_progress
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "video-media-123",
            processing_info: { state: "in_progress", check_after_secs: 1, progress_percent: 50 },
          }),
          { status: 200 },
        ),
      );

      // STATUS check — succeeded
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "video-media-123",
            processing_info: { state: "succeeded" },
          }),
          { status: 200 },
        ),
      );

      const mediaId = await adapter.uploadVideo("token", videoBuffer, "video/mp4");
      expect(mediaId).toBe("video-media-123");

      // INIT call uses v2 URL
      const initUrl = fetchSpy.mock.calls[0][0] as string;
      expect(initUrl).toContain("api.x.com/2/media/upload");

      // Verify 2 APPEND calls
      expect(fetchSpy).toHaveBeenCalledTimes(6); // INIT + 2 APPEND + FINALIZE + 2 STATUS
    });

    it("throws when processing fails", async () => {
      const videoBuffer = Buffer.alloc(1024);
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      // INIT
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "video-fail-123" }), { status: 200 }),
      );

      // APPEND
      fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }));

      // FINALIZE
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "video-fail-123",
            processing_info: { state: "pending", check_after_secs: 1 },
          }),
          { status: 200 },
        ),
      );

      // STATUS — failed
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "video-fail-123",
            processing_info: { state: "failed", error: { message: "Invalid video" } },
          }),
          { status: 200 },
        ),
      );

      await expect(
        adapter.uploadVideo("token", videoBuffer, "video/mp4"),
      ).rejects.toThrow("Media processing failed");
    });
  });

  describe("uploadGif", () => {
    it("uploads GIF with tweet_gif category", async () => {
      const gifBuffer = Buffer.alloc(1024);
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      // INIT
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "gif-media-123" }), { status: 200 }),
      );

      // APPEND
      fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }));

      // FINALIZE
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "gif-media-123" }), { status: 200 }),
      );

      const mediaId = await adapter.uploadGif("token", gifBuffer);
      expect(mediaId).toBe("gif-media-123");

      // INIT call should use tweet_gif category
      const initUrl = fetchSpy.mock.calls[0][0] as string;
      expect(initUrl).toContain("api.x.com/2/media/upload");
      const initBody = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(initBody.media_category).toBe("tweet_gif");
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

    it("includes poll when provided", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: { id: "tweet-poll", text: "Vote!" } }),
          { status: 201 },
        ),
      );

      await adapter.publishPost("token", {
        text: "Vote!",
        poll: { options: ["Yes", "No"], durationMinutes: 60 },
      });

      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(body.poll).toEqual({
        options: ["Yes", "No"],
        duration_minutes: 60,
      });
    });

    it("includes reply_settings when provided", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: { id: "tweet-rs", text: "Limited" } }),
          { status: 201 },
        ),
      );

      await adapter.publishPost("token", {
        text: "Limited replies",
        replySettings: "mentioned_users",
      });

      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(body.reply_settings).toBe("mentioned_users");
    });

    it("includes quote_tweet_id when provided", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: { id: "tweet-qt", text: "Quote" } }),
          { status: 201 },
        ),
      );

      await adapter.publishPost("token", {
        text: "Great take!",
        quoteTweetId: "original-tweet-123",
      });

      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(body.quote_tweet_id).toBe("original-tweet-123");
    });

    it("includes geo.place_id when placeId provided", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: { id: "tweet-geo", text: "At place" } }),
          { status: 201 },
        ),
      );

      await adapter.publishPost("token", {
        text: "Tweeting from here",
        placeId: "place-abc",
      });

      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(body.geo).toEqual({ place_id: "place-abc" });
    });

    it("includes community_id when communityId provided", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: { id: "tweet-comm", text: "Community" } }),
          { status: 201 },
        ),
      );

      await adapter.publishPost("token", {
        text: "Community post",
        communityId: "comm-123",
      });

      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(body.community_id).toBe("comm-123");
    });
  });

  describe("repost", () => {
    it("sends POST to retweets endpoint", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { retweeted: true } }), { status: 200 }),
      );

      await adapter.repost("token", "user-123", "tweet-456");

      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toBe("https://api.x.com/2/users/user-123/retweets");
      expect(options?.method).toBe("POST");
      const body = JSON.parse(options?.body as string);
      expect(body.tweet_id).toBe("tweet-456");
    });

    it("throws on error response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: "Forbidden" }), { status: 403 }),
      );

      await expect(
        adapter.repost("token", "user-123", "tweet-456"),
      ).rejects.toThrow("Repost failed");
    });
  });

  describe("unrepost", () => {
    it("sends DELETE to retweets endpoint", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { retweeted: false } }), { status: 200 }),
      );

      await adapter.unrepost("token", "user-123", "tweet-456");

      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toBe("https://api.x.com/2/users/user-123/retweets/tweet-456");
      expect(options?.method).toBe("DELETE");
    });

    it("throws on error response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: "Not Found" }), { status: 404 }),
      );

      await expect(
        adapter.unrepost("token", "user-123", "tweet-456"),
      ).rejects.toThrow("Unrepost failed");
    });
  });

  describe("editPost", () => {
    it("sends PUT to tweets endpoint with previous_tweet_id", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: { id: "tweet-edit", text: "Updated text" } }),
          { status: 200 },
        ),
      );

      await adapter.editPost("token", "tweet-original", {
        text: "Updated text",
      });

      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toBe("https://api.x.com/2/tweets");
      expect(options?.method).toBe("POST");
      const body = JSON.parse(options?.body as string);
      expect(body.text).toBe("Updated text");
      expect(body.edit_options).toEqual({
        previous_tweet_id: "tweet-original",
      });
    });

    it("throws on error response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: "Not editable" }), { status: 403 }),
      );

      await expect(
        adapter.editPost("token", "tweet-123", { text: "Updated" }),
      ).rejects.toThrow("Edit failed");
    });
  });

  describe("setMediaAltText", () => {
    it("sends POST to media metadata endpoint", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(null, { status: 200 }),
      );

      await adapter.setMediaAltText("token", "media-123", "A beautiful sunset");

      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toBe("https://api.x.com/2/media/metadata");
      expect(options?.method).toBe("POST");
      const body = JSON.parse(options?.body as string);
      expect(body.media_id).toBe("media-123");
      expect(body.alt_text).toBe("A beautiful sunset");
    });

    it("throws on error response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: "Bad request" }), { status: 400 }),
      );

      await expect(
        adapter.setMediaAltText("token", "media-123", "Alt text"),
      ).rejects.toThrow("Set alt text failed");
    });
  });

  // ─── Batch Metrics ──────────────────────────────────────────────────

  describe("fetchBatchMetrics", () => {
    it("fetches metrics for multiple tweets in a single API call", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              {
                id: "tweet-1",
                text: "Hello",
                public_metrics: {
                  impression_count: 1000,
                  like_count: 50,
                  reply_count: 5,
                  retweet_count: 10,
                  quote_count: 2,
                  bookmark_count: 7,
                },
              },
              {
                id: "tweet-2",
                text: "World",
                public_metrics: {
                  impression_count: 2000,
                  like_count: 100,
                  reply_count: 15,
                  retweet_count: 20,
                  quote_count: 5,
                  bookmark_count: 12,
                },
              },
            ],
          }),
          { status: 200 },
        ),
      );

      const result = await adapter.fetchBatchMetrics("token", ["tweet-1", "tweet-2"]);

      expect(fetchSpy).toHaveBeenCalledOnce();
      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain("/2/tweets?ids=tweet-1,tweet-2");
      expect(url).toContain("tweet.fields=public_metrics");

      expect(result).toHaveLength(2);
      expect(result[0].platformPostId).toBe("tweet-1");
      expect(result[0].impressions).toBe(1000);
      expect(result[0].likes).toBe(50);
      expect(result[0].replies).toBe(5);
      expect(result[0].reposts).toBe(10);
      expect(result[0].quotes).toBe(2);
      expect(result[0].bookmarks).toBe(7);
      expect(result[1].platformPostId).toBe("tweet-2");
      expect(result[1].impressions).toBe(2000);
    });

    it("batches over 100 IDs into multiple requests", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      // 150 tweet IDs = 2 batches (100 + 50)
      const ids = Array.from({ length: 150 }, (_, i) => `tweet-${i}`);

      // Mock first batch
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: ids.slice(0, 100).map((id) => ({
              id,
              text: "t",
              public_metrics: {
                impression_count: 1,
                like_count: 0,
                reply_count: 0,
                retweet_count: 0,
                quote_count: 0,
                bookmark_count: 0,
              },
            })),
          }),
          { status: 200 },
        ),
      );

      // Mock second batch
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: ids.slice(100).map((id) => ({
              id,
              text: "t",
              public_metrics: {
                impression_count: 2,
                like_count: 0,
                reply_count: 0,
                retweet_count: 0,
                quote_count: 0,
                bookmark_count: 0,
              },
            })),
          }),
          { status: 200 },
        ),
      );

      const result = await adapter.fetchBatchMetrics("token", ids);

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(150);
      // First batch items
      expect(result[0].impressions).toBe(1);
      // Second batch items
      expect(result[100].impressions).toBe(2);
    });

    it("returns empty array when no IDs provided", async () => {
      const result = await adapter.fetchBatchMetrics("token", []);
      expect(result).toEqual([]);
    });

    it("handles missing data field gracefully", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({}), { status: 200 }),
      );

      const result = await adapter.fetchBatchMetrics("token", ["tweet-1"]);
      expect(result).toEqual([]);
    });

    it("throws on non-OK response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: "Too Many Requests" }), { status: 429 }),
      );

      await expect(
        adapter.fetchBatchMetrics("token", ["tweet-1"]),
      ).rejects.toThrow("Batch metrics failed");
    });
  });

  // ─── Follower Count ─────────────────────────────────────────────────

  describe("fetchFollowerCount", () => {
    it("fetches user public_metrics to get follower count", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "user-123",
              public_metrics: {
                followers_count: 12500,
                following_count: 340,
                tweet_count: 8721,
                listed_count: 89,
              },
            },
          }),
          { status: 200 },
        ),
      );

      const result = await adapter.fetchFollowerCount("token", "user-123");

      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain("/2/users/user-123");
      expect(url).toContain("user.fields=public_metrics");

      expect(result.followerCount).toBe(12500);
      expect(result.followingCount).toBe(340);
      expect(result.tweetCount).toBe(8721);
    });

    it("throws on non-OK response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: "User not found" }), { status: 404 }),
      );

      await expect(
        adapter.fetchFollowerCount("token", "user-123"),
      ).rejects.toThrow("Fetch follower count failed");
    });
  });
});
