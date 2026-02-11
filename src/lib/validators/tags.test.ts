import { describe, it, expect } from "vitest";
import {
  normalizeTag,
  tagSchema,
  tagsArraySchema,
  MAX_TAGS_PER_POST,
  formatTagsForPublish,
  computeTagsCharLength,
} from "./tags";

describe("normalizeTag", () => {
  it("strips leading # symbol", () => {
    expect(normalizeTag("#javascript")).toBe("javascript");
  });

  it("lowercases the tag", () => {
    expect(normalizeTag("TypeScript")).toBe("typescript");
  });

  it("trims whitespace", () => {
    expect(normalizeTag("  react  ")).toBe("react");
  });

  it("handles combined # + uppercase + whitespace", () => {
    expect(normalizeTag("  #NextJS  ")).toBe("nextjs");
  });

  it("strips multiple leading # symbols", () => {
    expect(normalizeTag("##hashtag")).toBe("hashtag");
  });

  it("preserves hyphens", () => {
    expect(normalizeTag("building-in-public")).toBe("building-in-public");
  });
});

describe("tagSchema", () => {
  it("accepts valid lowercase alphanumeric tag", () => {
    expect(tagSchema.safeParse("javascript").success).toBe(true);
  });

  it("accepts tag with hyphens", () => {
    expect(tagSchema.safeParse("building-in-public").success).toBe(true);
  });

  it("accepts tag with numbers", () => {
    expect(tagSchema.safeParse("web3").success).toBe(true);
  });

  it("rejects empty string", () => {
    expect(tagSchema.safeParse("").success).toBe(false);
  });

  it("rejects tag over 30 characters", () => {
    expect(tagSchema.safeParse("a".repeat(31)).success).toBe(false);
  });

  it("accepts tag at exactly 30 characters", () => {
    expect(tagSchema.safeParse("a".repeat(30)).success).toBe(true);
  });

  it("rejects tag with uppercase letters", () => {
    expect(tagSchema.safeParse("JavaScript").success).toBe(false);
  });

  it("rejects tag with spaces", () => {
    expect(tagSchema.safeParse("my tag").success).toBe(false);
  });

  it("rejects tag with special characters", () => {
    expect(tagSchema.safeParse("tag!@#").success).toBe(false);
  });

  it("rejects tag starting with hyphen", () => {
    expect(tagSchema.safeParse("-tag").success).toBe(false);
  });

  it("rejects tag ending with hyphen", () => {
    expect(tagSchema.safeParse("tag-").success).toBe(false);
  });
});

describe("tagsArraySchema", () => {
  it("accepts empty array", () => {
    expect(tagsArraySchema.safeParse([]).success).toBe(true);
  });

  it("accepts array with valid tags", () => {
    expect(tagsArraySchema.safeParse(["react", "nextjs"]).success).toBe(true);
  });

  it("accepts up to 5 tags", () => {
    const tags = ["a", "b", "c", "d", "e"];
    expect(tagsArraySchema.safeParse(tags).success).toBe(true);
  });

  it("rejects more than 5 tags", () => {
    const tags = ["a", "b", "c", "d", "e", "f"];
    expect(tagsArraySchema.safeParse(tags).success).toBe(false);
  });

  it("rejects array with invalid tag", () => {
    expect(tagsArraySchema.safeParse(["valid", "INVALID"]).success).toBe(false);
  });
});

describe("MAX_TAGS_PER_POST", () => {
  it("is 5", () => {
    expect(MAX_TAGS_PER_POST).toBe(5);
  });
});

describe("formatTagsForPublish", () => {
  it("returns empty string for empty array", () => {
    expect(formatTagsForPublish([])).toBe("");
  });

  it("formats single tag with space and #", () => {
    expect(formatTagsForPublish(["react"])).toBe(" #react");
  });

  it("formats multiple tags with spaces", () => {
    expect(formatTagsForPublish(["react", "nextjs"])).toBe(" #react #nextjs");
  });

  it("preserves tag order", () => {
    expect(formatTagsForPublish(["a", "b", "c"])).toBe(" #a #b #c");
  });
});

describe("computeTagsCharLength", () => {
  it("returns 0 for empty array", () => {
    expect(computeTagsCharLength([])).toBe(0);
  });

  it("returns correct length for single tag", () => {
    // " #react" = 7 chars
    expect(computeTagsCharLength(["react"])).toBe(7);
  });

  it("returns correct length for multiple tags", () => {
    // " #react #nextjs" = 15 chars
    expect(computeTagsCharLength(["react", "nextjs"])).toBe(15);
  });

  it("matches formatTagsForPublish output length", () => {
    const tags = ["building-in-public", "saas", "startup"];
    expect(computeTagsCharLength(tags)).toBe(formatTagsForPublish(tags).length);
  });
});
