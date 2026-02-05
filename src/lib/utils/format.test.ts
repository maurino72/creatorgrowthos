import { describe, it, expect } from "vitest";
import { formatNumber, formatEngagementRate, formatTimeAgo } from "./format";

describe("formatNumber", () => {
  it("returns '0' for zero", () => {
    expect(formatNumber(0)).toBe("0");
  });

  it("returns the number as-is for values under 1000", () => {
    expect(formatNumber(999)).toBe("999");
  });

  it("formats thousands with K suffix", () => {
    expect(formatNumber(1500)).toBe("1.5K");
  });

  it("formats exact thousands cleanly", () => {
    expect(formatNumber(1000)).toBe("1K");
  });

  it("formats millions with M suffix", () => {
    expect(formatNumber(1500000)).toBe("1.5M");
  });

  it("handles undefined by returning '–'", () => {
    expect(formatNumber(undefined)).toBe("–");
  });

  it("handles null by returning '–'", () => {
    expect(formatNumber(null)).toBe("–");
  });
});

describe("formatEngagementRate", () => {
  it("formats rate as percentage", () => {
    expect(formatEngagementRate(0.045)).toBe("4.5%");
  });

  it("formats zero rate", () => {
    expect(formatEngagementRate(0)).toBe("0%");
  });

  it("handles null by returning '–'", () => {
    expect(formatEngagementRate(null)).toBe("–");
  });

  it("handles undefined by returning '–'", () => {
    expect(formatEngagementRate(undefined)).toBe("–");
  });
});

describe("formatTimeAgo", () => {
  it("returns 'just now' for times less than a minute ago", () => {
    const now = new Date().toISOString();
    expect(formatTimeAgo(now)).toBe("just now");
  });

  it("returns minutes ago", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatTimeAgo(fiveMinAgo)).toBe("5m ago");
  });

  it("returns hours ago", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(formatTimeAgo(twoHoursAgo)).toBe("2h ago");
  });

  it("returns days ago", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatTimeAgo(threeDaysAgo)).toBe("3d ago");
  });

  it("handles undefined by returning '–'", () => {
    expect(formatTimeAgo(undefined)).toBe("–");
  });
});
