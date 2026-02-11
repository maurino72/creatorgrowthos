import { z } from "zod";

export const MAX_TAGS_PER_POST = 5;

export function normalizeTag(raw: string): string {
  return raw.trim().replace(/^#+/, "").toLowerCase();
}

export const tagSchema = z
  .string()
  .min(1)
  .max(30)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Tag must be lowercase alphanumeric with optional hyphens");

export const tagsArraySchema = z.array(tagSchema).max(MAX_TAGS_PER_POST);

export function formatTagsForPublish(tags: string[]): string {
  if (tags.length === 0) return "";
  return tags.map((t) => ` #${t}`).join("");
}

export function computeTagsCharLength(tags: string[]): number {
  return formatTagsForPublish(tags).length;
}
