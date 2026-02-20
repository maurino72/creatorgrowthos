import { z } from "zod";

const threadPostSchema = z.object({
  body: z.string().min(1),
  media_urls: z.array(z.string().min(1)).optional(),
});

export const threadSchema = z.object({
  title: z.string().optional(),
  posts: z.array(threadPostSchema).min(2),
});

export type ThreadInput = z.infer<typeof threadSchema>;

/**
 * Split long text into thread-sized chunks.
 * Prioritizes splitting at: paragraph breaks > sentence endings > word boundaries.
 */
export function splitTextIntoThread(
  text: string,
  charLimit: number,
): string[] {
  if (!text) return [];
  if (text.length <= charLimit) return [text];

  const parts: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= charLimit) {
      parts.push(remaining.trim());
      break;
    }

    const chunk = remaining.slice(0, charLimit);

    // Try paragraph break
    const paraBreak = chunk.lastIndexOf("\n\n");
    if (paraBreak > 0) {
      parts.push(remaining.slice(0, paraBreak).trim());
      remaining = remaining.slice(paraBreak + 2).trim();
      continue;
    }

    // Try sentence boundary (. or ! or ? followed by space)
    const sentenceMatch = chunk.match(/[\s\S]*[.!?]\s/);
    if (sentenceMatch) {
      const end = sentenceMatch[0].length;
      parts.push(remaining.slice(0, end).trim());
      remaining = remaining.slice(end).trim();
      continue;
    }

    // Try word boundary
    const lastSpace = chunk.lastIndexOf(" ");
    if (lastSpace > 0) {
      parts.push(remaining.slice(0, lastSpace).trim());
      remaining = remaining.slice(lastSpace + 1).trim();
      continue;
    }

    // Hard split (no word boundary found)
    parts.push(remaining.slice(0, charLimit));
    remaining = remaining.slice(charLimit);
  }

  return parts.filter((p) => p.length > 0);
}
