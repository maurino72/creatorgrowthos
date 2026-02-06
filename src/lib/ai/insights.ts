import { z } from "zod/v4";

export const INSIGHT_TYPES = [
  "performance_pattern",
  "consistency_pattern",
  "opportunity",
  "anomaly",
] as const;

export const CONFIDENCE_LEVELS = ["high", "medium", "low"] as const;

export const INSIGHT_STATUSES = [
  "active",
  "dismissed",
  "acted_on",
  "expired",
] as const;

// Minimum data thresholds
export const MIN_POSTS = 20;
export const MIN_POSTS_PER_INTENT = 5;
export const MIN_POSTS_PER_TOPIC = 3;
export const MIN_WEEKS_FOR_TRENDS = 4;

// Schemas
export const insightTypeSchema = z.enum(INSIGHT_TYPES);
export const confidenceLevelSchema = z.enum(CONFIDENCE_LEVELS);
export const insightStatusSchema = z.enum(INSIGHT_STATUSES);

export const dataPointSchema = z.object({
  metric: z.string().min(1),
  value: z.string().min(1),
  comparison: z.string().optional(),
});

export const insightSchema = z.object({
  type: insightTypeSchema,
  headline: z.string().min(1),
  detail: z.string().min(1),
  data_points: z.array(dataPointSchema),
  action: z.string().min(1),
  confidence: confidenceLevelSchema,
});

export const insightsArraySchema = z.array(insightSchema).min(3).max(5);

// Types
export type InsightType = (typeof INSIGHT_TYPES)[number];
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];
export type InsightStatus = (typeof INSIGHT_STATUSES)[number];
export type DataPoint = z.infer<typeof dataPointSchema>;
export type Insight = z.infer<typeof insightSchema>;
