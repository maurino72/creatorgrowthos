import { describe, it, expect } from "vitest";
import {
  INSIGHT_TYPES,
  CONFIDENCE_LEVELS,
  INSIGHT_STATUSES,
  MIN_POSTS,
  MIN_POSTS_PER_INTENT,
  MIN_POSTS_PER_TOPIC,
  MIN_WEEKS_FOR_TRENDS,
  insightTypeSchema,
  confidenceLevelSchema,
  insightStatusSchema,
  dataPointSchema,
  insightSchema,
  insightsArraySchema,
  type InsightType,
  type ConfidenceLevel,
  type InsightStatus,
  type DataPoint,
  type Insight,
} from "./insights";

describe("Insight constants", () => {
  it("exports INSIGHT_TYPES with 4 categories", () => {
    expect(INSIGHT_TYPES).toEqual([
      "performance_pattern",
      "consistency_pattern",
      "opportunity",
      "anomaly",
    ]);
    expect(INSIGHT_TYPES).toHaveLength(4);
  });

  it("exports CONFIDENCE_LEVELS with 3 levels", () => {
    expect(CONFIDENCE_LEVELS).toEqual(["high", "medium", "low"]);
    expect(CONFIDENCE_LEVELS).toHaveLength(3);
  });

  it("exports INSIGHT_STATUSES with 4 statuses", () => {
    expect(INSIGHT_STATUSES).toEqual([
      "active",
      "dismissed",
      "acted_on",
      "expired",
    ]);
    expect(INSIGHT_STATUSES).toHaveLength(4);
  });

  it("exports data threshold constants", () => {
    expect(MIN_POSTS).toBe(20);
    expect(MIN_POSTS_PER_INTENT).toBe(5);
    expect(MIN_POSTS_PER_TOPIC).toBe(3);
    expect(MIN_WEEKS_FOR_TRENDS).toBe(4);
  });
});

describe("insightTypeSchema", () => {
  it("accepts valid insight types", () => {
    for (const type of INSIGHT_TYPES) {
      expect(insightTypeSchema.parse(type)).toBe(type);
    }
  });

  it("rejects invalid insight type", () => {
    expect(() => insightTypeSchema.parse("invalid")).toThrow();
  });
});

describe("confidenceLevelSchema", () => {
  it("accepts valid confidence levels", () => {
    for (const level of CONFIDENCE_LEVELS) {
      expect(confidenceLevelSchema.parse(level)).toBe(level);
    }
  });

  it("rejects invalid confidence level", () => {
    expect(() => confidenceLevelSchema.parse("very_high")).toThrow();
  });
});

describe("insightStatusSchema", () => {
  it("accepts valid statuses", () => {
    for (const status of INSIGHT_STATUSES) {
      expect(insightStatusSchema.parse(status)).toBe(status);
    }
  });

  it("rejects invalid status", () => {
    expect(() => insightStatusSchema.parse("archived")).toThrow();
  });
});

describe("dataPointSchema", () => {
  it("accepts valid data point", () => {
    const dp = { metric: "engagement_rate", value: "4.2%", comparison: "2x higher than average" };
    expect(dataPointSchema.parse(dp)).toEqual(dp);
  });

  it("accepts data point without comparison", () => {
    const dp = { metric: "impressions", value: "2,400" };
    const result = dataPointSchema.parse(dp);
    expect(result.metric).toBe("impressions");
    expect(result.value).toBe("2,400");
  });

  it("rejects data point without metric", () => {
    expect(() => dataPointSchema.parse({ value: "100" })).toThrow();
  });

  it("rejects data point without value", () => {
    expect(() => dataPointSchema.parse({ metric: "likes" })).toThrow();
  });
});

describe("insightSchema", () => {
  const validInsight = {
    type: "performance_pattern",
    headline: "Educational content is your superpower",
    detail: "Your educational posts average 3.2x more engagement than promotional posts.",
    data_points: [
      { metric: "engagement_rate", value: "4.2%", comparison: "vs 1.3% for promotional" },
    ],
    action: "Consider posting more educational threads",
    confidence: "high",
  };

  it("accepts a valid insight", () => {
    const result = insightSchema.parse(validInsight);
    expect(result.type).toBe("performance_pattern");
    expect(result.headline).toBe("Educational content is your superpower");
    expect(result.confidence).toBe("high");
  });

  it("accepts insight with multiple data points", () => {
    const insight = {
      ...validInsight,
      data_points: [
        { metric: "impressions", value: "2,400" },
        { metric: "engagement_rate", value: "4.2%", comparison: "2x avg" },
        { metric: "replies", value: "12", comparison: "3x avg" },
      ],
    };
    const result = insightSchema.parse(insight);
    expect(result.data_points).toHaveLength(3);
  });

  it("accepts insight with empty data_points array", () => {
    const insight = { ...validInsight, data_points: [] };
    const result = insightSchema.parse(insight);
    expect(result.data_points).toEqual([]);
  });

  it("rejects insight without headline", () => {
    const { headline, ...rest } = validInsight;
    expect(() => insightSchema.parse(rest)).toThrow();
  });

  it("rejects insight with invalid type", () => {
    expect(() => insightSchema.parse({ ...validInsight, type: "unknown" })).toThrow();
  });

  it("rejects insight with invalid confidence", () => {
    expect(() => insightSchema.parse({ ...validInsight, confidence: "very_high" })).toThrow();
  });
});

describe("insightsArraySchema", () => {
  const makeInsight = (idx: number) => ({
    type: "performance_pattern",
    headline: `Insight ${idx}`,
    detail: `Detail for insight ${idx}`,
    data_points: [{ metric: "likes", value: String(idx * 10) }],
    action: `Do something ${idx}`,
    confidence: "medium",
  });

  it("accepts array of 3 insights", () => {
    const arr = [makeInsight(1), makeInsight(2), makeInsight(3)];
    const result = insightsArraySchema.parse(arr);
    expect(result).toHaveLength(3);
  });

  it("accepts array of 5 insights", () => {
    const arr = Array.from({ length: 5 }, (_, i) => makeInsight(i + 1));
    const result = insightsArraySchema.parse(arr);
    expect(result).toHaveLength(5);
  });

  it("rejects array of 2 insights (min 3)", () => {
    const arr = [makeInsight(1), makeInsight(2)];
    expect(() => insightsArraySchema.parse(arr)).toThrow();
  });

  it("rejects array of 6 insights (max 5)", () => {
    const arr = Array.from({ length: 6 }, (_, i) => makeInsight(i + 1));
    expect(() => insightsArraySchema.parse(arr)).toThrow();
  });

  it("rejects empty array", () => {
    expect(() => insightsArraySchema.parse([])).toThrow();
  });
});

describe("TypeScript types", () => {
  it("InsightType matches INSIGHT_TYPES values", () => {
    const t: InsightType = "performance_pattern";
    expect(INSIGHT_TYPES).toContain(t);
  });

  it("ConfidenceLevel matches CONFIDENCE_LEVELS values", () => {
    const c: ConfidenceLevel = "high";
    expect(CONFIDENCE_LEVELS).toContain(c);
  });

  it("InsightStatus matches INSIGHT_STATUSES values", () => {
    const s: InsightStatus = "active";
    expect(INSIGHT_STATUSES).toContain(s);
  });

  it("DataPoint type works with schema output", () => {
    const dp: DataPoint = { metric: "likes", value: "42" };
    expect(dp.metric).toBe("likes");
  });

  it("Insight type works with schema output", () => {
    const insight: Insight = {
      type: "anomaly",
      headline: "Breakout post",
      detail: "One post performed 5x above average",
      data_points: [{ metric: "engagement", value: "500%" }],
      action: "Consider a follow-up",
      confidence: "high",
    };
    expect(insight.type).toBe("anomaly");
  });
});
