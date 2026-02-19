import { describe, it, expect } from "vitest";
import {
  mentionSuggestionSchema,
  mentionSuggestionsArraySchema,
  type MentionSuggestion,
} from "./mentions";

describe("mentionSuggestionSchema", () => {
  it("accepts valid suggestion", () => {
    const result = mentionSuggestionSchema.safeParse({
      handle: "dan_abramov",
      relevance: "high",
      reason: "React core team member",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing handle", () => {
    const result = mentionSuggestionSchema.safeParse({
      relevance: "high",
      reason: "Some reason",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing relevance", () => {
    const result = mentionSuggestionSchema.safeParse({
      handle: "dan_abramov",
      reason: "Some reason",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing reason", () => {
    const result = mentionSuggestionSchema.safeParse({
      handle: "dan_abramov",
      relevance: "high",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid relevance value", () => {
    const result = mentionSuggestionSchema.safeParse({
      handle: "dan_abramov",
      relevance: "super",
      reason: "Some reason",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid relevance levels", () => {
    for (const relevance of ["high", "medium", "low"]) {
      const result = mentionSuggestionSchema.safeParse({
        handle: "react",
        relevance,
        reason: "Relevant account",
      });
      expect(result.success).toBe(true);
    }
  });
});

describe("mentionSuggestionsArraySchema", () => {
  it("accepts array of 3 suggestions", () => {
    const suggestions = Array.from({ length: 3 }, (_, i) => ({
      handle: `user${i}`,
      relevance: "high",
      reason: `Reason ${i}`,
    }));
    expect(mentionSuggestionsArraySchema.safeParse(suggestions).success).toBe(true);
  });

  it("accepts array of 5 suggestions", () => {
    const suggestions = Array.from({ length: 5 }, (_, i) => ({
      handle: `user${i}`,
      relevance: "medium",
      reason: `Reason ${i}`,
    }));
    expect(mentionSuggestionsArraySchema.safeParse(suggestions).success).toBe(true);
  });

  it("accepts a single suggestion (min 1)", () => {
    const suggestions = [{ handle: "react", relevance: "high", reason: "Core framework" }];
    expect(mentionSuggestionsArraySchema.safeParse(suggestions).success).toBe(true);
  });

  it("rejects an empty array", () => {
    expect(mentionSuggestionsArraySchema.safeParse([]).success).toBe(false);
  });

  it("rejects more than 5 suggestions", () => {
    const suggestions = Array.from({ length: 6 }, (_, i) => ({
      handle: `user${i}`,
      relevance: "low",
      reason: `Reason ${i}`,
    }));
    expect(mentionSuggestionsArraySchema.safeParse(suggestions).success).toBe(false);
  });
});
