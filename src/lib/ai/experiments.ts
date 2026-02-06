import { z } from "zod/v4";
import { CONFIDENCE_LEVELS } from "./insights";

export const EXPERIMENT_TYPES = [
  "format_test",
  "topic_test",
  "style_test",
] as const;

export type ExperimentType = (typeof EXPERIMENT_TYPES)[number];

export const EXPERIMENT_STATUSES = [
  "suggested",
  "accepted",
  "running",
  "analyzing",
  "complete",
  "dismissed",
] as const;

export type ExperimentStatus = (typeof EXPERIMENT_STATUSES)[number];

export const experimentSuggestionSchema = z.object({
  type: z.enum(EXPERIMENT_TYPES),
  hypothesis: z.string().min(1),
  description: z.string().min(1),
  recommended_action: z.string().min(1),
  confidence: z.enum(CONFIDENCE_LEVELS),
});

export type ExperimentSuggestion = z.infer<typeof experimentSuggestionSchema>;

export const experimentSuggestionsArraySchema = z
  .array(experimentSuggestionSchema)
  .min(1)
  .max(3);
