import { describe, it, expect } from "vitest";
import {
  hashtagSuggestionSchema,
  hashtagSuggestionsArraySchema,
  type HashtagSuggestion,
} from "./hashtags";

describe("hashtagSuggestionSchema", () => {
  it("accepts valid suggestion", () => {
    const result = hashtagSuggestionSchema.safeParse({
      tag: "React",
      relevance: "high",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing tag", () => {
    const result = hashtagSuggestionSchema.safeParse({
      relevance: "high",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing relevance", () => {
    const result = hashtagSuggestionSchema.safeParse({
      tag: "React",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid relevance value", () => {
    const result = hashtagSuggestionSchema.safeParse({
      tag: "React",
      relevance: "super",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid relevance levels", () => {
    for (const relevance of ["high", "medium", "low"]) {
      const result = hashtagSuggestionSchema.safeParse({
        tag: "React",
        relevance,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe("hashtagSuggestionsArraySchema", () => {
  it("accepts array of 3 suggestions", () => {
    const suggestions = Array.from({ length: 3 }, (_, i) => ({
      tag: `tag${i}`,
      relevance: "high",
    }));
    expect(hashtagSuggestionsArraySchema.safeParse(suggestions).success).toBe(true);
  });

  it("accepts array of 5 suggestions", () => {
    const suggestions = Array.from({ length: 5 }, (_, i) => ({
      tag: `tag${i}`,
      relevance: "medium",
    }));
    expect(hashtagSuggestionsArraySchema.safeParse(suggestions).success).toBe(true);
  });

  it("accepts a single suggestion (min 1)", () => {
    const suggestions = [{ tag: "React", relevance: "high" }];
    expect(hashtagSuggestionsArraySchema.safeParse(suggestions).success).toBe(true);
  });

  it("rejects an empty array", () => {
    expect(hashtagSuggestionsArraySchema.safeParse([]).success).toBe(false);
  });

  it("rejects more than 5 suggestions", () => {
    const suggestions = Array.from({ length: 6 }, (_, i) => ({
      tag: `tag${i}`,
      relevance: "low",
    }));
    expect(hashtagSuggestionsArraySchema.safeParse(suggestions).success).toBe(false);
  });
});
