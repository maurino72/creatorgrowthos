import { z } from "zod/v4";

export const mentionSuggestionSchema = z.object({
  handle: z.string().min(1),
  relevance: z.enum(["high", "medium", "low"]),
  reason: z.string().min(1),
});

export type MentionSuggestion = z.infer<typeof mentionSuggestionSchema>;

export const mentionSuggestionsArraySchema = z
  .array(mentionSuggestionSchema)
  .min(1)
  .max(5);
