import { z } from "zod/v4";

export const IMPROVEMENT_TYPES = [
  "hook",
  "clarity",
  "engagement",
  "length",
  "focus",
] as const;

export type ImprovementType = (typeof IMPROVEMENT_TYPES)[number];

export const improvementSuggestionSchema = z.object({
  type: z.enum(IMPROVEMENT_TYPES),
  suggestion: z.string().min(1),
  example: z.string().min(1),
});

export const improvementResponseSchema = z.object({
  overall_assessment: z.string().min(1),
  improvements: z.array(improvementSuggestionSchema).min(1),
  improved_version: z.string().optional(),
});

export type ImprovementResponse = z.infer<typeof improvementResponseSchema>;
