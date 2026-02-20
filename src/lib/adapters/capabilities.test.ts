import { describe, it, expect } from "vitest";
import {
  PLATFORM_CAPABILITIES,
  type PlatformCapabilities,
} from "./capabilities";

describe("PLATFORM_CAPABILITIES", () => {
  describe("twitter", () => {
    it("supports all expected features", () => {
      const twitter = PLATFORM_CAPABILITIES.twitter;
      expect(twitter.poll).toBe(true);
      expect(twitter.thread).toBe(true);
      expect(twitter.video).toBe(true);
      expect(twitter.gif).toBe(true);
      expect(twitter.images).toBe(true);
      expect(twitter.altText).toBe(true);
      expect(twitter.replySettings).toBe(true);
      expect(twitter.quoteTweet).toBe(true);
      expect(twitter.repost).toBe(true);
      expect(twitter.geo).toBe(true);
      expect(twitter.community).toBe(true);
      expect(twitter.editPost).toBe(true);
    });

    it("has correct media limits", () => {
      const twitter = PLATFORM_CAPABILITIES.twitter;
      expect(twitter.maxImages).toBe(4);
      expect(twitter.maxVideos).toBe(1);
      expect(twitter.maxGifs).toBe(1);
      expect(twitter.maxPollOptions).toBe(4);
      expect(twitter.minPollOptions).toBe(2);
      expect(twitter.maxPollOptionLength).toBe(25);
      expect(twitter.minPollDurationMinutes).toBe(5);
      expect(twitter.maxPollDurationMinutes).toBe(10080);
    });
  });

  describe("linkedin", () => {
    it("does not support twitter-specific features", () => {
      const linkedin = PLATFORM_CAPABILITIES.linkedin;
      expect(linkedin.poll).toBe(false);
      expect(linkedin.thread).toBe(false);
      expect(linkedin.quoteTweet).toBe(false);
      expect(linkedin.repost).toBe(false);
      expect(linkedin.replySettings).toBe(false);
      expect(linkedin.geo).toBe(false);
      expect(linkedin.community).toBe(false);
      expect(linkedin.editPost).toBe(false);
    });

    it("supports media features", () => {
      const linkedin = PLATFORM_CAPABILITIES.linkedin;
      expect(linkedin.images).toBe(true);
      expect(linkedin.video).toBe(true);
      expect(linkedin.gif).toBe(true);
      expect(linkedin.altText).toBe(true);
    });
  });

  describe("threads", () => {
    it("does not support most advanced features", () => {
      const threads = PLATFORM_CAPABILITIES.threads;
      expect(threads.poll).toBe(false);
      expect(threads.quoteTweet).toBe(false);
      expect(threads.repost).toBe(false);
      expect(threads.replySettings).toBe(false);
      expect(threads.geo).toBe(false);
      expect(threads.community).toBe(false);
      expect(threads.editPost).toBe(false);
    });

    it("supports basic media", () => {
      const threads = PLATFORM_CAPABILITIES.threads;
      expect(threads.images).toBe(true);
      expect(threads.video).toBe(true);
      expect(threads.gif).toBe(true);
    });
  });

  it("all platforms implement PlatformCapabilities interface", () => {
    const platforms = Object.keys(PLATFORM_CAPABILITIES) as Array<
      keyof typeof PLATFORM_CAPABILITIES
    >;
    expect(platforms).toContain("twitter");
    expect(platforms).toContain("linkedin");
    expect(platforms).toContain("threads");

    for (const platform of platforms) {
      const caps: PlatformCapabilities = PLATFORM_CAPABILITIES[platform];
      expect(typeof caps.poll).toBe("boolean");
      expect(typeof caps.thread).toBe("boolean");
      expect(typeof caps.video).toBe("boolean");
      expect(typeof caps.images).toBe("boolean");
    }
  });
});
