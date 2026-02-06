import { describe, it, expect } from "vitest";
import {
  contentIdeaSchema,
  ideasArraySchema,
  type ContentIdea,
} from "./ideas";

describe("contentIdeaSchema", () => {
  const validIdea = {
    headline: "Behind-the-scenes of your latest feature",
    format: "thread",
    intent: "educate",
    topic: "building-in-public",
    rationale: "Your building-in-public threads average 2.3x engagement",
    suggested_hook: "I just shipped [feature]. Here's what I learned:",
    confidence: "high",
  };

  it("accepts a valid content idea", () => {
    const result = contentIdeaSchema.parse(validIdea);
    expect(result.headline).toBe("Behind-the-scenes of your latest feature");
    expect(result.format).toBe("thread");
    expect(result.intent).toBe("educate");
    expect(result.confidence).toBe("high");
  });

  it("accepts all valid formats", () => {
    for (const format of ["single", "thread", "reply", "quote"]) {
      const result = contentIdeaSchema.parse({ ...validIdea, format });
      expect(result.format).toBe(format);
    }
  });

  it("accepts all valid intents", () => {
    for (const intent of ["educate", "engage", "promote", "personal", "curate", "entertain"]) {
      const result = contentIdeaSchema.parse({ ...validIdea, intent });
      expect(result.intent).toBe(intent);
    }
  });

  it("accepts all confidence levels", () => {
    for (const confidence of ["high", "medium", "low"]) {
      const result = contentIdeaSchema.parse({ ...validIdea, confidence });
      expect(result.confidence).toBe(confidence);
    }
  });

  it("rejects idea without headline", () => {
    const { headline, ...rest } = validIdea;
    expect(() => contentIdeaSchema.parse(rest)).toThrow();
  });

  it("rejects idea with invalid format", () => {
    expect(() => contentIdeaSchema.parse({ ...validIdea, format: "essay" })).toThrow();
  });

  it("rejects idea with invalid intent", () => {
    expect(() => contentIdeaSchema.parse({ ...validIdea, intent: "sell" })).toThrow();
  });

  it("rejects idea with invalid confidence", () => {
    expect(() => contentIdeaSchema.parse({ ...validIdea, confidence: "very_high" })).toThrow();
  });

  it("rejects idea without suggested_hook", () => {
    const { suggested_hook, ...rest } = validIdea;
    expect(() => contentIdeaSchema.parse(rest)).toThrow();
  });
});

describe("ideasArraySchema", () => {
  const makeIdea = (idx: number): ContentIdea => ({
    headline: `Idea ${idx}`,
    format: "single",
    intent: "educate",
    topic: `topic-${idx}`,
    rationale: `Rationale for idea ${idx}`,
    suggested_hook: `Hook for idea ${idx}`,
    confidence: "medium",
  });

  it("accepts array of 3 ideas", () => {
    const arr = [makeIdea(1), makeIdea(2), makeIdea(3)];
    const result = ideasArraySchema.parse(arr);
    expect(result).toHaveLength(3);
  });

  it("accepts array of 5 ideas", () => {
    const arr = Array.from({ length: 5 }, (_, i) => makeIdea(i + 1));
    const result = ideasArraySchema.parse(arr);
    expect(result).toHaveLength(5);
  });

  it("rejects array of 2 ideas (min 3)", () => {
    const arr = [makeIdea(1), makeIdea(2)];
    expect(() => ideasArraySchema.parse(arr)).toThrow();
  });

  it("rejects array of 6 ideas (max 5)", () => {
    const arr = Array.from({ length: 6 }, (_, i) => makeIdea(i + 1));
    expect(() => ideasArraySchema.parse(arr)).toThrow();
  });

  it("rejects empty array", () => {
    expect(() => ideasArraySchema.parse([])).toThrow();
  });
});

describe("ContentIdea type", () => {
  it("matches schema output shape", () => {
    const idea: ContentIdea = {
      headline: "Test",
      format: "thread",
      intent: "engage",
      topic: "ai",
      rationale: "It works",
      suggested_hook: "Did you know...",
      confidence: "low",
    };
    expect(idea.headline).toBe("Test");
    expect(idea.format).toBe("thread");
  });
});
