import { z } from "zod";

export const INTENTS = [
  "educate",
  "engage",
  "promote",
  "personal",
  "curate",
  "entertain",
] as const;

export type Intent = (typeof INTENTS)[number];

export const CONTENT_TYPES = [
  "single",
  "thread",
  "reply",
  "quote",
] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];

export const intentSchema = z.enum(INTENTS);
export const contentTypeSchema = z.enum(CONTENT_TYPES);
export const topicsSchema = z.array(z.string().min(1)).min(1).max(3);

/** Schema for validating AI classification response */
export const classificationSchema = z.object({
  intent: intentSchema,
  content_type: contentTypeSchema,
  topics: topicsSchema,
  confidence: z
    .object({
      intent: z.number().min(0).max(1).optional(),
      content_type: z.number().min(0).max(1).optional(),
    })
    .optional(),
});

export type Classification = z.infer<typeof classificationSchema>;

/** Schema for manual override — at least one field required */
export const classificationOverrideSchema = z
  .object({
    intent: intentSchema.optional(),
    content_type: contentTypeSchema.optional(),
    topics: topicsSchema.optional(),
  })
  .refine(
    (data) =>
      data.intent !== undefined ||
      data.content_type !== undefined ||
      data.topics !== undefined,
    { message: "At least one classification field is required" },
  );

export type ClassificationOverride = z.infer<typeof classificationOverrideSchema>;

/** Normalize a single topic: lowercase, trim, replace spaces with hyphens */
export function normalizeTopic(topic: string): string {
  return topic
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

/** Normalize an array of topics: normalize each, remove empties, deduplicate */
export function normalizeTopics(topics: string[]): string[] {
  const normalized = topics
    .map(normalizeTopic)
    .filter((t) => t.length > 0);
  return [...new Set(normalized)];
}
