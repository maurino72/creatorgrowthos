import { z } from "zod";

export const MAX_MENTIONS_PER_POST = 5;

export function normalizeMention(raw: string): string {
  return raw.trim().replace(/^@+/, "").toLowerCase();
}

export const mentionSchema = z
  .string()
  .min(1)
  .max(15)
  .regex(/^[a-z0-9_]+$/, "Handle must be lowercase alphanumeric with underscores, 1-15 chars");

export const mentionsArraySchema = z.array(mentionSchema).max(MAX_MENTIONS_PER_POST);

export function formatMentionsForPublish(mentions: string[]): string {
  if (mentions.length === 0) return "";
  return mentions.map((m) => ` @${m}`).join("");
}

export function computeMentionsCharLength(mentions: string[]): number {
  return formatMentionsForPublish(mentions).length;
}
