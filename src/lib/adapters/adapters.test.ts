import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAdapterForPlatform } from "./index";
import { TwitterAdapter } from "./twitter";
import type { AuthResult } from "./types";

describe("platform adapter registry", () => {
  it("returns a TwitterAdapter for 'twitter'", () => {
    const adapter = getAdapterForPlatform("twitter");
    expect(adapter).toBeInstanceOf(TwitterAdapter);
  });

  it("throws for an unregistered platform", () => {
    expect(() =>
      getAdapterForPlatform("unknown" as "twitter"),
    ).toThrow("No adapter registered for platform: unknown");
  });
});

describe("TwitterAdapter (interface compliance)", () => {
  let adapter: TwitterAdapter;

  beforeEach(() => {
    vi.stubEnv("TWITTER_CLIENT_ID", "test-id");
    vi.stubEnv("TWITTER_CLIENT_SECRET", "test-secret");
    adapter = new TwitterAdapter();
  });

  it("getAuthUrl returns an AuthResult", () => {
    const result: AuthResult = adapter.getAuthUrl("state", "http://localhost/callback");
    expect(result).toHaveProperty("url");
    expect(result).toHaveProperty("codeVerifier");
    expect(typeof result.url).toBe("string");
  });

  it("publishPost calls Twitter API and returns result", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { id: "123", text: "hello" } }), { status: 201 }),
    );

    const result = await adapter.publishPost("token", { text: "hello" });
    expect(result.platformPostId).toBe("123");
    expect(result.platformUrl).toContain("123");
  });

  it("deletePost calls Twitter API without error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { deleted: true } }), { status: 200 }),
    );

    await expect(adapter.deletePost("token", "id")).resolves.toBeUndefined();
  });

  it("fetchPostMetrics calls Twitter API and returns a RawMetricSnapshot", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            id: "id",
            public_metrics: {
              impression_count: 100,
              like_count: 5,
              reply_count: 1,
              retweet_count: 2,
            },
          },
        }),
        { status: 200 },
      ),
    );

    const result = await adapter.fetchPostMetrics("token", "id");
    expect(result.impressions).toBe(100);
    expect(result.observedAt).toBeInstanceOf(Date);
  });
});
