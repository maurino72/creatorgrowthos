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
  it("strips leading # symbol and capitalizes", () => {
    expect(normalizeTag("#javascript")).toBe("Javascript");
  });

  it("capitalizes first letter of single word", () => {
    expect(normalizeTag("react")).toBe("React");
  });

  it("trims whitespace", () => {
    expect(normalizeTag("  react  ")).toBe("React");
  });

  it("converts hyphenated words to CamelCase", () => {
    expect(normalizeTag("building-in-public")).toBe("BuildingInPublic");
  });

  it("preserves existing CamelCase", () => {
    expect(normalizeTag("NextJS")).toBe("NextJS");
  });

  it("handles combined # + casing + whitespace", () => {
    expect(normalizeTag("  #NextJS  ")).toBe("NextJS");
  });

  it("strips multiple leading # symbols", () => {
    expect(normalizeTag("##hashtag")).toBe("Hashtag");
  });

  it("capitalizes each segment after hyphens", () => {
    expect(normalizeTag("web3-dev")).toBe("Web3Dev");
  });
});

describe("tagSchema", () => {
  it("accepts CamelCase tag", () => {
    expect(tagSchema.safeParse("JavaScript").success).toBe(true);
  });

  it("accepts single capitalized word", () => {
    expect(tagSchema.safeParse("React").success).toBe(true);
  });

  it("accepts tag with numbers", () => {
    expect(tagSchema.safeParse("Web3").success).toBe(true);
  });

  it("accepts multi-word CamelCase", () => {
    expect(tagSchema.safeParse("BuildingInPublic").success).toBe(true);
  });

  it("rejects empty string", () => {
    expect(tagSchema.safeParse("").success).toBe(false);
  });

  it("rejects tag over 30 characters", () => {
    expect(tagSchema.safeParse("A".repeat(31)).success).toBe(false);
  });

  it("accepts tag at exactly 30 characters", () => {
    expect(tagSchema.safeParse("A".repeat(30)).success).toBe(true);
  });

  it("rejects tag starting with lowercase", () => {
    expect(tagSchema.safeParse("javascript").success).toBe(false);
  });

  it("rejects tag with spaces", () => {
    expect(tagSchema.safeParse("My Tag").success).toBe(false);
  });

  it("rejects tag with special characters", () => {
    expect(tagSchema.safeParse("Tag!@#").success).toBe(false);
  });

  it("rejects tag with hyphens", () => {
    expect(tagSchema.safeParse("Building-In-Public").success).toBe(false);
  });
});

describe("tagsArraySchema", () => {
  it("accepts empty array", () => {
    expect(tagsArraySchema.safeParse([]).success).toBe(true);
  });

  it("accepts array with valid CamelCase tags", () => {
    expect(tagsArraySchema.safeParse(["React", "NextJs"]).success).toBe(true);
  });

  it("accepts up to 5 tags", () => {
    const tags = ["A", "B", "C", "D", "E"];
    expect(tagsArraySchema.safeParse(tags).success).toBe(true);
  });

  it("rejects more than 5 tags", () => {
    const tags = ["A", "B", "C", "D", "E", "F"];
    expect(tagsArraySchema.safeParse(tags).success).toBe(false);
  });

  it("rejects array with lowercase tag", () => {
    expect(tagsArraySchema.safeParse(["React", "invalid"]).success).toBe(false);
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

  it("formats single CamelCase tag with space and #", () => {
    expect(formatTagsForPublish(["React"])).toBe(" #React");
  });

  it("formats multiple CamelCase tags with spaces", () => {
    expect(formatTagsForPublish(["React", "NextJs"])).toBe(" #React #NextJs");
  });

  it("preserves tag order", () => {
    expect(formatTagsForPublish(["A", "B", "C"])).toBe(" #A #B #C");
  });
});

describe("computeTagsCharLength", () => {
  it("returns 0 for empty array", () => {
    expect(computeTagsCharLength([])).toBe(0);
  });

  it("returns correct length for single tag", () => {
    // " #React" = 7 chars
    expect(computeTagsCharLength(["React"])).toBe(7);
  });

  it("returns correct length for multiple tags", () => {
    // " #React #NextJs" = 15 chars
    expect(computeTagsCharLength(["React", "NextJs"])).toBe(15);
  });

  it("matches formatTagsForPublish output length", () => {
    const tags = ["BuildingInPublic", "SaaS", "Startup"];
    expect(computeTagsCharLength(tags)).toBe(formatTagsForPublish(tags).length);
  });
});
