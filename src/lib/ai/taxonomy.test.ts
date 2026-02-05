import { describe, it, expect } from "vitest";
import {
  INTENTS,
  CONTENT_TYPES,
  intentSchema,
  contentTypeSchema,
  topicsSchema,
  classificationSchema,
  classificationOverrideSchema,
  normalizeTopic,
  normalizeTopics,
  type Intent,
  type ContentType,
} from "./taxonomy";

describe("taxonomy constants", () => {
  it("defines all 6 intent categories", () => {
    expect(INTENTS).toEqual([
      "educate",
      "engage",
      "promote",
      "personal",
      "curate",
      "entertain",
    ]);
  });

  it("defines all 4 content types", () => {
    expect(CONTENT_TYPES).toEqual(["single", "thread", "reply", "quote"]);
  });
});

describe("intentSchema", () => {
  it("accepts valid intents", () => {
    expect(intentSchema.parse("educate")).toBe("educate");
    expect(intentSchema.parse("entertain")).toBe("entertain");
  });

  it("rejects invalid intents", () => {
    expect(() => intentSchema.parse("invalid")).toThrow();
    expect(() => intentSchema.parse("")).toThrow();
  });
});

describe("contentTypeSchema", () => {
  it("accepts valid content types", () => {
    expect(contentTypeSchema.parse("single")).toBe("single");
    expect(contentTypeSchema.parse("thread")).toBe("thread");
  });

  it("rejects invalid content types", () => {
    expect(() => contentTypeSchema.parse("blog")).toThrow();
  });
});

describe("topicsSchema", () => {
  it("accepts 1-3 topic strings", () => {
    expect(topicsSchema.parse(["ai"])).toEqual(["ai"]);
    expect(topicsSchema.parse(["ai", "saas", "startup"])).toEqual([
      "ai",
      "saas",
      "startup",
    ]);
  });

  it("rejects empty array", () => {
    expect(() => topicsSchema.parse([])).toThrow();
  });

  it("rejects more than 3 topics", () => {
    expect(() => topicsSchema.parse(["a", "b", "c", "d"])).toThrow();
  });

  it("rejects non-string topics", () => {
    expect(() => topicsSchema.parse([123])).toThrow();
  });
});

describe("classificationSchema (AI response)", () => {
  it("parses a valid full classification", () => {
    const result = classificationSchema.parse({
      intent: "educate",
      content_type: "single",
      topics: ["ai", "saas"],
      confidence: { intent: 0.9, content_type: 0.85 },
    });
    expect(result.intent).toBe("educate");
    expect(result.content_type).toBe("single");
    expect(result.topics).toEqual(["ai", "saas"]);
  });

  it("accepts classification without confidence", () => {
    const result = classificationSchema.parse({
      intent: "engage",
      content_type: "reply",
      topics: ["marketing"],
    });
    expect(result.confidence).toBeUndefined();
  });

  it("rejects invalid intent in classification", () => {
    expect(() =>
      classificationSchema.parse({
        intent: "spam",
        content_type: "single",
        topics: ["ai"],
      }),
    ).toThrow();
  });
});

describe("classificationOverrideSchema (manual override input)", () => {
  it("accepts partial override with just intent", () => {
    const result = classificationOverrideSchema.parse({ intent: "promote" });
    expect(result.intent).toBe("promote");
    expect(result.content_type).toBeUndefined();
    expect(result.topics).toBeUndefined();
  });

  it("accepts partial override with just topics", () => {
    const result = classificationOverrideSchema.parse({
      topics: ["startup", "fundraising"],
    });
    expect(result.topics).toEqual(["startup", "fundraising"]);
  });

  it("accepts full override", () => {
    const result = classificationOverrideSchema.parse({
      intent: "curate",
      content_type: "quote",
      topics: ["ai"],
    });
    expect(result.intent).toBe("curate");
    expect(result.content_type).toBe("quote");
  });

  it("rejects empty object", () => {
    expect(() => classificationOverrideSchema.parse({})).toThrow();
  });

  it("rejects invalid intent value", () => {
    expect(() =>
      classificationOverrideSchema.parse({ intent: "spam" }),
    ).toThrow();
  });
});

describe("normalizeTopic", () => {
  it("lowercases the topic", () => {
    expect(normalizeTopic("AI")).toBe("ai");
    expect(normalizeTopic("SaaS")).toBe("saas");
  });

  it("replaces spaces with hyphens", () => {
    expect(normalizeTopic("machine learning")).toBe("machine-learning");
    expect(normalizeTopic("building in public")).toBe("building-in-public");
  });

  it("trims whitespace", () => {
    expect(normalizeTopic("  ai  ")).toBe("ai");
  });

  it("handles multiple spaces", () => {
    expect(normalizeTopic("deep   learning")).toBe("deep-learning");
  });
});

describe("normalizeTopics", () => {
  it("normalizes an array of topics", () => {
    expect(normalizeTopics(["AI", "Machine Learning", " startup "])).toEqual([
      "ai",
      "machine-learning",
      "startup",
    ]);
  });

  it("deduplicates after normalization", () => {
    expect(normalizeTopics(["AI", "ai", "Ai"])).toEqual(["ai"]);
  });

  it("removes empty strings after trimming", () => {
    expect(normalizeTopics(["ai", "  ", "saas"])).toEqual(["ai", "saas"]);
  });
});
