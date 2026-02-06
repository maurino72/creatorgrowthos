import { describe, it, expect } from "vitest";
import {
  EXPERIMENT_TYPES,
  EXPERIMENT_STATUSES,
  experimentSuggestionSchema,
  experimentSuggestionsArraySchema,
  type ExperimentSuggestion,
} from "./experiments";

describe("EXPERIMENT_TYPES", () => {
  it("contains expected experiment types", () => {
    expect(EXPERIMENT_TYPES).toContain("format_test");
    expect(EXPERIMENT_TYPES).toContain("topic_test");
    expect(EXPERIMENT_TYPES).toContain("style_test");
  });
});

describe("EXPERIMENT_STATUSES", () => {
  it("contains all lifecycle statuses", () => {
    expect(EXPERIMENT_STATUSES).toContain("suggested");
    expect(EXPERIMENT_STATUSES).toContain("accepted");
    expect(EXPERIMENT_STATUSES).toContain("running");
    expect(EXPERIMENT_STATUSES).toContain("analyzing");
    expect(EXPERIMENT_STATUSES).toContain("complete");
    expect(EXPERIMENT_STATUSES).toContain("dismissed");
  });
});

describe("experimentSuggestionSchema", () => {
  const validSuggestion = {
    type: "format_test",
    hypothesis: "Threads outperform single posts for educational content",
    description: "Post the same insight as both a thread and a single post",
    recommended_action: "Create a thread version of your next educational post",
    confidence: "high",
  };

  it("accepts a valid experiment suggestion", () => {
    const result = experimentSuggestionSchema.parse(validSuggestion);
    expect(result.type).toBe("format_test");
    expect(result.hypothesis).toContain("Threads outperform");
  });

  it("accepts all valid types", () => {
    for (const type of EXPERIMENT_TYPES) {
      const result = experimentSuggestionSchema.parse({ ...validSuggestion, type });
      expect(result.type).toBe(type);
    }
  });

  it("rejects invalid type", () => {
    expect(() =>
      experimentSuggestionSchema.parse({ ...validSuggestion, type: "ab_test" }),
    ).toThrow();
  });

  it("rejects missing hypothesis", () => {
    const { hypothesis, ...rest } = validSuggestion;
    expect(() => experimentSuggestionSchema.parse(rest)).toThrow();
  });

  it("rejects missing recommended_action", () => {
    const { recommended_action, ...rest } = validSuggestion;
    expect(() => experimentSuggestionSchema.parse(rest)).toThrow();
  });
});

describe("experimentSuggestionsArraySchema", () => {
  const make = (idx: number): ExperimentSuggestion => ({
    type: "format_test",
    hypothesis: `Hypothesis ${idx}`,
    description: `Description ${idx}`,
    recommended_action: `Action ${idx}`,
    confidence: "medium",
  });

  it("accepts array of 1-3 suggestions", () => {
    expect(experimentSuggestionsArraySchema.parse([make(1)])).toHaveLength(1);
    expect(experimentSuggestionsArraySchema.parse([make(1), make(2), make(3)])).toHaveLength(3);
  });

  it("rejects empty array", () => {
    expect(() => experimentSuggestionsArraySchema.parse([])).toThrow();
  });

  it("rejects more than 3 suggestions", () => {
    expect(() =>
      experimentSuggestionsArraySchema.parse([make(1), make(2), make(3), make(4)]),
    ).toThrow();
  });
});

describe("ExperimentSuggestion type", () => {
  it("matches schema output shape", () => {
    const suggestion: ExperimentSuggestion = {
      type: "topic_test",
      hypothesis: "Test",
      description: "Desc",
      recommended_action: "Do it",
      confidence: "low",
    };
    expect(suggestion.type).toBe("topic_test");
  });
});
