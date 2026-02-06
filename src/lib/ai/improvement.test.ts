import { describe, it, expect } from "vitest";
import {
  improvementSuggestionSchema,
  improvementResponseSchema,
  type ImprovementResponse,
  IMPROVEMENT_TYPES,
} from "./improvement";

describe("IMPROVEMENT_TYPES", () => {
  it("contains expected improvement types", () => {
    expect(IMPROVEMENT_TYPES).toContain("hook");
    expect(IMPROVEMENT_TYPES).toContain("clarity");
    expect(IMPROVEMENT_TYPES).toContain("engagement");
    expect(IMPROVEMENT_TYPES).toContain("length");
    expect(IMPROVEMENT_TYPES).toContain("focus");
  });
});

describe("improvementSuggestionSchema", () => {
  const validSuggestion = {
    type: "hook",
    suggestion: "Start with the outcome, not the process",
    example: "I grew my SaaS to $10K MRR. Here's how:",
  };

  it("accepts a valid suggestion", () => {
    const result = improvementSuggestionSchema.parse(validSuggestion);
    expect(result.type).toBe("hook");
    expect(result.suggestion).toBe("Start with the outcome, not the process");
  });

  it("accepts all valid types", () => {
    for (const type of IMPROVEMENT_TYPES) {
      const result = improvementSuggestionSchema.parse({ ...validSuggestion, type });
      expect(result.type).toBe(type);
    }
  });

  it("rejects invalid type", () => {
    expect(() =>
      improvementSuggestionSchema.parse({ ...validSuggestion, type: "spelling" }),
    ).toThrow();
  });

  it("rejects missing suggestion", () => {
    const { suggestion, ...rest } = validSuggestion;
    expect(() => improvementSuggestionSchema.parse(rest)).toThrow();
  });
});

describe("improvementResponseSchema", () => {
  const validResponse = {
    overall_assessment: "Strong educational post with room for a better hook",
    improvements: [
      {
        type: "hook",
        suggestion: "Lead with the outcome",
        example: "I grew to $10K MRR. Here's the playbook:",
      },
      {
        type: "engagement",
        suggestion: "End with a question",
        example: "What's the hardest part of building in public for you?",
      },
    ],
    improved_version: "I grew to $10K MRR. Here's the playbook:\n\n...",
  };

  it("accepts a valid improvement response", () => {
    const result = improvementResponseSchema.parse(validResponse);
    expect(result.overall_assessment).toContain("Strong educational");
    expect(result.improvements).toHaveLength(2);
    expect(result.improved_version).toContain("$10K MRR");
  });

  it("accepts response without improved_version", () => {
    const { improved_version, ...rest } = validResponse;
    const result = improvementResponseSchema.parse(rest);
    expect(result.improved_version).toBeUndefined();
  });

  it("requires at least 1 improvement", () => {
    expect(() =>
      improvementResponseSchema.parse({ ...validResponse, improvements: [] }),
    ).toThrow();
  });

  it("rejects missing overall_assessment", () => {
    const { overall_assessment, ...rest } = validResponse;
    expect(() => improvementResponseSchema.parse(rest)).toThrow();
  });
});

describe("ImprovementResponse type", () => {
  it("matches schema output shape", () => {
    const response: ImprovementResponse = {
      overall_assessment: "Good post",
      improvements: [
        { type: "hook", suggestion: "Better hook", example: "Try this:" },
      ],
      improved_version: "Better version",
    };
    expect(response.overall_assessment).toBe("Good post");
    expect(response.improvements).toHaveLength(1);
  });
});
