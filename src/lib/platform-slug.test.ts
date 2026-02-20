import { describe, it, expect } from "vitest";
import {
  slugToPlatform,
  platformToSlug,
  isValidPlatformSlug,
  VALID_PLATFORM_SLUGS,
  type PlatformSlug,
} from "./platform-slug";

describe("platform-slug", () => {
  describe("VALID_PLATFORM_SLUGS", () => {
    it("contains x, linkedin, and threads", () => {
      expect(VALID_PLATFORM_SLUGS).toEqual(["x", "linkedin", "threads"]);
    });
  });

  describe("slugToPlatform", () => {
    it("maps x to twitter", () => {
      expect(slugToPlatform("x")).toBe("twitter");
    });

    it("maps linkedin to linkedin", () => {
      expect(slugToPlatform("linkedin")).toBe("linkedin");
    });

    it("maps threads to threads", () => {
      expect(slugToPlatform("threads")).toBe("threads");
    });

    it("returns null for invalid slug", () => {
      expect(slugToPlatform("settings")).toBeNull();
    });

    it("returns null for random string", () => {
      expect(slugToPlatform("random")).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(slugToPlatform("")).toBeNull();
    });
  });

  describe("platformToSlug", () => {
    it("maps twitter to x", () => {
      expect(platformToSlug("twitter")).toBe("x");
    });

    it("maps linkedin to linkedin", () => {
      expect(platformToSlug("linkedin")).toBe("linkedin");
    });

    it("maps threads to threads", () => {
      expect(platformToSlug("threads")).toBe("threads");
    });
  });

  describe("isValidPlatformSlug", () => {
    it("returns true for x", () => {
      expect(isValidPlatformSlug("x")).toBe(true);
    });

    it("returns true for linkedin", () => {
      expect(isValidPlatformSlug("linkedin")).toBe(true);
    });

    it("returns true for threads", () => {
      expect(isValidPlatformSlug("threads")).toBe(true);
    });

    it("returns false for settings", () => {
      expect(isValidPlatformSlug("settings")).toBe(false);
    });

    it("returns false for connections", () => {
      expect(isValidPlatformSlug("connections")).toBe(false);
    });

    it("returns false for random string", () => {
      expect(isValidPlatformSlug("random")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isValidPlatformSlug("")).toBe(false);
    });
  });

  describe("bidirectional mapping", () => {
    it("roundtrips x -> twitter -> x", () => {
      const platform = slugToPlatform("x");
      expect(platform).toBe("twitter");
      expect(platformToSlug(platform!)).toBe("x");
    });

    it("roundtrips linkedin -> linkedin -> linkedin", () => {
      const platform = slugToPlatform("linkedin");
      expect(platform).toBe("linkedin");
      expect(platformToSlug(platform!)).toBe("linkedin");
    });

    it("roundtrips threads -> threads -> threads", () => {
      const platform = slugToPlatform("threads");
      expect(platform).toBe("threads");
      expect(platformToSlug(platform!)).toBe("threads");
    });
  });

  describe("PlatformSlug type", () => {
    it("accepts valid slugs as type", () => {
      const slug: PlatformSlug = "x";
      expect(isValidPlatformSlug(slug)).toBe(true);
    });
  });
});
