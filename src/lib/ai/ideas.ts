import { z } from "zod/v4";
import { INTENTS, CONTENT_TYPES } from "./taxonomy";
import { CONFIDENCE_LEVELS } from "./insights";

export const contentIdeaSchema = z.object({
  headline: z.string().min(1),
  format: z.enum(CONTENT_TYPES),
  intent: z.enum(INTENTS),
  topic: z.string().min(1),
  rationale: z.string().min(1),
  suggested_hook: z.string().min(1),
  confidence: z.enum(CONFIDENCE_LEVELS),
});

export type ContentIdea = z.infer<typeof contentIdeaSchema>;

export const ideasArraySchema = z.array(contentIdeaSchema).min(3).max(5);
