import { z } from "zod";

export const MAX_TAGS_PER_POST = 5;

export function normalizeTag(raw: string): string {
  const stripped = raw.trim().replace(/^#+/, "");
  // Split on hyphens, capitalize first letter of each segment, join
  return stripped
    .split("-")
    .map((segment) =>
      segment.length > 0
        ? segment.charAt(0).toUpperCase() + segment.slice(1)
        : "",
    )
    .join("");
}

export const tagSchema = z
  .string()
  .min(1)
  .max(30)
  .regex(/^[A-Z][a-zA-Z0-9]*$/, "Tag must be CamelCase alphanumeric starting with uppercase");

export const tagsArraySchema = z.array(tagSchema).max(MAX_TAGS_PER_POST);

export function formatTagsForPublish(tags: string[]): string {
  if (tags.length === 0) return "";
  return tags.map((t) => ` #${t}`).join("");
}

export function computeTagsCharLength(tags: string[]): number {
  return formatTagsForPublish(tags).length;
}
