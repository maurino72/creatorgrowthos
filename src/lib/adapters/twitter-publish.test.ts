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

  describe("publishPost", () => {
    it("sends POST request to Twitter tweets endpoint with Bearer token", async () => {
      const mockResponse = {
        data: {
          id: "1234567890",
          text: "Hello from Creator Growth OS!",
        },
      };

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 201 }),
      );

      await adapter.publishPost("access-token-123", { text: "Hello from Creator Growth OS!" });

      expect(fetchSpy).toHaveBeenCalledOnce();
      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toBe("https://api.x.com/2/tweets");
      expect(options?.method).toBe("POST");
      expect(options?.headers).toEqual(
        expect.objectContaining({
          Authorization: "Bearer access-token-123",
          "Content-Type": "application/json",
        }),
      );
    });

    it("sends text in request body", async () => {
      const mockResponse = {
        data: { id: "123", text: "Hello!" },
      };

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 201 }),
      );

      await adapter.publishPost("token", { text: "Hello!" });

      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(body.text).toBe("Hello!");
    });

    it("includes reply settings when replyToId is provided", async () => {
      const mockResponse = {
        data: { id: "456", text: "Reply text" },
      };

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 201 }),
      );

      await adapter.publishPost("token", {
        text: "Reply text",
        replyToId: "original-tweet-id",
      });

      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(body.reply).toEqual({ in_reply_to_tweet_id: "original-tweet-id" });
    });

    it("does not include reply field when replyToId is not provided", async () => {
      const mockResponse = {
        data: { id: "123", text: "Hello!" },
      };

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 201 }),
      );

      await adapter.publishPost("token", { text: "Hello!" });

      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(body.reply).toBeUndefined();
    });

    it("returns PlatformPostResult with correct fields", async () => {
      const mockResponse = {
        data: { id: "9876543210", text: "Published tweet" },
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 201 }),
      );

      const result = await adapter.publishPost("token", { text: "Published tweet" });

      expect(result.platformPostId).toBe("9876543210");
      expect(result.platformUrl).toBe("https://twitter.com/i/status/9876543210");
      expect(result.publishedAt).toBeInstanceOf(Date);
    });

    it("throws on non-OK response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            detail: "You are not permitted to create a Tweet with duplicate content.",
            type: "about:blank",
            title: "Forbidden",
            status: 403,
          }),
          { status: 403 },
        ),
      );

      await expect(
        adapter.publishPost("token", { text: "Duplicate tweet" }),
      ).rejects.toThrow("Publish failed");
    });

    it("throws on 401 unauthorized", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ title: "Unauthorized" }), { status: 401 }),
      );

      await expect(
        adapter.publishPost("bad-token", { text: "Hello" }),
      ).rejects.toThrow("Publish failed");
    });

    it("throws on rate limit (429)", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({ title: "Too Many Requests", detail: "Rate limit exceeded" }),
          { status: 429 },
        ),
      );

      await expect(
        adapter.publishPost("token", { text: "Hello" }),
      ).rejects.toThrow("Publish failed");
    });
  });

  describe("deletePost", () => {
    it("sends DELETE request to Twitter tweets endpoint with Bearer token", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { deleted: true } }), { status: 200 }),
      );

      await adapter.deletePost("access-token-123", "tweet-id-456");

      expect(fetchSpy).toHaveBeenCalledOnce();
      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toBe("https://api.x.com/2/tweets/tweet-id-456");
      expect(options?.method).toBe("DELETE");
      expect(options?.headers).toEqual(
        expect.objectContaining({
          Authorization: "Bearer access-token-123",
        }),
      );
    });

    it("resolves on successful deletion", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { deleted: true } }), { status: 200 }),
      );

      await expect(adapter.deletePost("token", "tweet-id")).resolves.toBeUndefined();
    });

    it("throws on non-OK response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ title: "Not Found" }), { status: 404 }),
      );

      await expect(
        adapter.deletePost("token", "nonexistent-id"),
      ).rejects.toThrow("Delete failed");
    });

    it("throws on 401 unauthorized", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ title: "Unauthorized" }), { status: 401 }),
      );

      await expect(
        adapter.deletePost("bad-token", "tweet-id"),
      ).rejects.toThrow("Delete failed");
    });
  });
});
