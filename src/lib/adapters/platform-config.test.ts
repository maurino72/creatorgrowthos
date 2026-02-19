import { describe, it, expect } from "vitest";
import {
  PLATFORM_CHAR_LIMITS,
  getCharLimitForPlatform,
  getCharLimitForPlatforms,
} from "./platform-config";

describe("PLATFORM_CHAR_LIMITS", () => {
  it("has 280 for twitter", () => {
    expect(PLATFORM_CHAR_LIMITS.twitter).toBe(280);
  });

  it("has 3000 for linkedin", () => {
    expect(PLATFORM_CHAR_LIMITS.linkedin).toBe(3000);
  });

  it("has 500 for threads", () => {
    expect(PLATFORM_CHAR_LIMITS.threads).toBe(500);
  });
});

describe("getCharLimitForPlatform", () => {
  it("returns 280 for twitter", () => {
    expect(getCharLimitForPlatform("twitter")).toBe(280);
  });

  it("returns 3000 for linkedin", () => {
    expect(getCharLimitForPlatform("linkedin")).toBe(3000);
  });

  it("returns 500 for threads", () => {
    expect(getCharLimitForPlatform("threads")).toBe(500);
  });
});

describe("getCharLimitForPlatforms", () => {
  it("returns 280 for twitter-only", () => {
    expect(getCharLimitForPlatforms(["twitter"])).toBe(280);
  });

  it("returns 3000 for linkedin-only", () => {
    expect(getCharLimitForPlatforms(["linkedin"])).toBe(3000);
  });

  it("returns Math.min across multiple platforms", () => {
    expect(getCharLimitForPlatforms(["twitter", "linkedin"])).toBe(280);
  });

  it("returns min of all three platforms", () => {
    expect(getCharLimitForPlatforms(["twitter", "linkedin", "threads"])).toBe(280);
  });

  it("returns min for linkedin + threads (500)", () => {
    expect(getCharLimitForPlatforms(["linkedin", "threads"])).toBe(500);
  });

  it("returns 280 for empty array (default fallback)", () => {
    expect(getCharLimitForPlatforms([])).toBe(280);
  });
});
