import { describe, it, expect } from "vitest";
import {
  trendingTopicSchema,
  trendingTopicsArraySchema,
  type TrendingTopic,
} from "./trending";

describe("trendingTopicSchema", () => {
  const validTopic: TrendingTopic = {
    topic: "AI agents are replacing junior developers",
    description: "Growing debate about AI coding assistants taking entry-level jobs",
    relevance: "high",
  };

  it("accepts a valid trending topic", () => {
    const result = trendingTopicSchema.parse(validTopic);
    expect(result.topic).toBe(validTopic.topic);
    expect(result.description).toBe(validTopic.description);
    expect(result.relevance).toBe("high");
  });

  it("accepts all valid relevance levels", () => {
    for (const relevance of ["high", "medium", "low"]) {
      const result = trendingTopicSchema.parse({ ...validTopic, relevance });
      expect(result.relevance).toBe(relevance);
    }
  });

  it("rejects topic without topic field", () => {
    const { topic, ...rest } = validTopic;
    expect(() => trendingTopicSchema.parse(rest)).toThrow();
  });

  it("rejects topic without description field", () => {
    const { description, ...rest } = validTopic;
    expect(() => trendingTopicSchema.parse(rest)).toThrow();
  });

  it("rejects topic with empty topic string", () => {
    expect(() => trendingTopicSchema.parse({ ...validTopic, topic: "" })).toThrow();
  });

  it("rejects topic with empty description string", () => {
    expect(() => trendingTopicSchema.parse({ ...validTopic, description: "" })).toThrow();
  });

  it("rejects invalid relevance level", () => {
    expect(() => trendingTopicSchema.parse({ ...validTopic, relevance: "critical" })).toThrow();
  });
});

describe("trendingTopicsArraySchema", () => {
  const makeTopic = (idx: number): TrendingTopic => ({
    topic: `Trending topic ${idx}`,
    description: `Description for topic ${idx}`,
    relevance: "medium",
  });

  it("accepts array of 1 topic (minimum)", () => {
    const result = trendingTopicsArraySchema.parse([makeTopic(1)]);
    expect(result).toHaveLength(1);
  });

  it("accepts array of 5 topics", () => {
    const arr = Array.from({ length: 5 }, (_, i) => makeTopic(i + 1));
    const result = trendingTopicsArraySchema.parse(arr);
    expect(result).toHaveLength(5);
  });

  it("accepts array of 10 topics (maximum)", () => {
    const arr = Array.from({ length: 10 }, (_, i) => makeTopic(i + 1));
    const result = trendingTopicsArraySchema.parse(arr);
    expect(result).toHaveLength(10);
  });

  it("rejects empty array", () => {
    expect(() => trendingTopicsArraySchema.parse([])).toThrow();
  });

  it("rejects array of 11 topics (over max)", () => {
    const arr = Array.from({ length: 11 }, (_, i) => makeTopic(i + 1));
    expect(() => trendingTopicsArraySchema.parse(arr)).toThrow();
  });
});

describe("TrendingTopic type", () => {
  it("matches schema output shape", () => {
    const topic: TrendingTopic = {
      topic: "Test",
      description: "A test topic",
      relevance: "low",
    };
    expect(topic.topic).toBe("Test");
    expect(topic.relevance).toBe("low");
  });
});
