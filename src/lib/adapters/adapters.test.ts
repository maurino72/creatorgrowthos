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

  it("throws 'Not implemented' for publishPost", async () => {
    await expect(
      adapter.publishPost("token", { text: "hello" }),
    ).rejects.toThrow("Not implemented");
  });

  it("throws 'Not implemented' for deletePost", async () => {
    await expect(adapter.deletePost("token", "id")).rejects.toThrow(
      "Not implemented",
    );
  });

  it("throws 'Not implemented' for fetchPostMetrics", async () => {
    await expect(adapter.fetchPostMetrics("token", "id")).rejects.toThrow(
      "Not implemented",
    );
  });
});
