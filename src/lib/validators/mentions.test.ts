import { describe, it, expect } from "vitest";
import {
  normalizeMention,
  mentionSchema,
  mentionsArraySchema,
  MAX_MENTIONS_PER_POST,
  formatMentionsForPublish,
  computeMentionsCharLength,
} from "./mentions";

describe("normalizeMention", () => {
  it("strips leading @ symbol and lowercases", () => {
    expect(normalizeMention("@JohnDoe")).toBe("johndoe");
  });

  it("lowercases handle", () => {
    expect(normalizeMention("React")).toBe("react");
  });

  it("trims whitespace", () => {
    expect(normalizeMention("  react  ")).toBe("react");
  });

  it("strips multiple leading @ symbols", () => {
    expect(normalizeMention("@@handle")).toBe("handle");
  });

  it("handles combined @ + casing + whitespace", () => {
    expect(normalizeMention("  @NextJS  ")).toBe("nextjs");
  });

  it("preserves underscores", () => {
    expect(normalizeMention("@dan_abramov")).toBe("dan_abramov");
  });

  it("preserves numbers", () => {
    expect(normalizeMention("@user123")).toBe("user123");
  });
});

describe("mentionSchema", () => {
  it("accepts valid lowercase handle", () => {
    expect(mentionSchema.safeParse("johndoe").success).toBe(true);
  });

  it("accepts handle with underscores", () => {
    expect(mentionSchema.safeParse("dan_abramov").success).toBe(true);
  });

  it("accepts handle with numbers", () => {
    expect(mentionSchema.safeParse("user123").success).toBe(true);
  });

  it("accepts single character handle", () => {
    expect(mentionSchema.safeParse("a").success).toBe(true);
  });

  it("accepts handle at exactly 15 characters", () => {
    expect(mentionSchema.safeParse("a".repeat(15)).success).toBe(true);
  });

  it("rejects empty string", () => {
    expect(mentionSchema.safeParse("").success).toBe(false);
  });

  it("rejects handle over 15 characters", () => {
    expect(mentionSchema.safeParse("a".repeat(16)).success).toBe(false);
  });

  it("rejects handle with uppercase", () => {
    expect(mentionSchema.safeParse("JohnDoe").success).toBe(false);
  });

  it("rejects handle with spaces", () => {
    expect(mentionSchema.safeParse("john doe").success).toBe(false);
  });

  it("rejects handle with special characters", () => {
    expect(mentionSchema.safeParse("user@name").success).toBe(false);
  });

  it("rejects handle with hyphens", () => {
    expect(mentionSchema.safeParse("user-name").success).toBe(false);
  });
});

describe("mentionsArraySchema", () => {
  it("accepts empty array", () => {
    expect(mentionsArraySchema.safeParse([]).success).toBe(true);
  });

  it("accepts array with valid handles", () => {
    expect(mentionsArraySchema.safeParse(["react", "nextjs"]).success).toBe(true);
  });

  it("accepts up to 5 mentions", () => {
    const mentions = ["a", "b", "c", "d", "e"];
    expect(mentionsArraySchema.safeParse(mentions).success).toBe(true);
  });

  it("rejects more than 5 mentions", () => {
    const mentions = ["a", "b", "c", "d", "e", "f"];
    expect(mentionsArraySchema.safeParse(mentions).success).toBe(false);
  });

  it("rejects array with invalid handle", () => {
    expect(mentionsArraySchema.safeParse(["react", "INVALID"]).success).toBe(false);
  });
});

describe("MAX_MENTIONS_PER_POST", () => {
  it("is 5", () => {
    expect(MAX_MENTIONS_PER_POST).toBe(5);
  });
});

describe("formatMentionsForPublish", () => {
  it("returns empty string for empty array", () => {
    expect(formatMentionsForPublish([])).toBe("");
  });

  it("formats single mention with space and @", () => {
    expect(formatMentionsForPublish(["react"])).toBe(" @react");
  });

  it("formats multiple mentions with spaces", () => {
    expect(formatMentionsForPublish(["react", "nextjs"])).toBe(" @react @nextjs");
  });

  it("preserves mention order", () => {
    expect(formatMentionsForPublish(["a", "b", "c"])).toBe(" @a @b @c");
  });
});

describe("computeMentionsCharLength", () => {
  it("returns 0 for empty array", () => {
    expect(computeMentionsCharLength([])).toBe(0);
  });

  it("returns correct length for single mention", () => {
    // " @react" = 7 chars
    expect(computeMentionsCharLength(["react"])).toBe(7);
  });

  it("returns correct length for multiple mentions", () => {
    // " @react @nextjs" = 15 chars
    expect(computeMentionsCharLength(["react", "nextjs"])).toBe(15);
  });

  it("matches formatMentionsForPublish output length", () => {
    const mentions = ["dan_abramov", "vercel", "nextjs"];
    expect(computeMentionsCharLength(mentions)).toBe(formatMentionsForPublish(mentions).length);
  });
});
