import { z } from "zod/v4";

export const hashtagSuggestionSchema = z.object({
  tag: z.string().min(1),
  relevance: z.enum(["high", "medium", "low"]),
});

export type HashtagSuggestion = z.infer<typeof hashtagSuggestionSchema>;

export const hashtagSuggestionsArraySchema = z
  .array(hashtagSuggestionSchema)
  .min(3)
  .max(5);
