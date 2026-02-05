import { describe, it, expect } from "vitest";
import { getAdapterForPlatform } from "./index";
import { TwitterAdapter } from "./twitter";

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

describe("TwitterAdapter", () => {
  const adapter = new TwitterAdapter();

  it("throws 'Not implemented' for getAuthUrl", () => {
    expect(() => adapter.getAuthUrl("state", "http://localhost")).toThrow(
      "Not implemented",
    );
  });

  it("throws 'Not implemented' for exchangeCodeForTokens", async () => {
    await expect(
      adapter.exchangeCodeForTokens("code", "http://localhost"),
    ).rejects.toThrow("Not implemented");
  });

  it("throws 'Not implemented' for refreshTokens", async () => {
    await expect(adapter.refreshTokens("token")).rejects.toThrow(
      "Not implemented",
    );
  });

  it("throws 'Not implemented' for getCurrentUser", async () => {
    await expect(adapter.getCurrentUser("token")).rejects.toThrow(
      "Not implemented",
    );
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
