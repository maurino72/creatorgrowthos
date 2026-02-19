import { z } from "zod";
import type { PlatformType } from "@/lib/adapters/types";
import { getCharLimitForPlatforms } from "@/lib/adapters/platform-config";
import { mediaUrlsSchema } from "./media";
import { mentionsArraySchema } from "./mentions";
import { tagsArraySchema } from "./tags";

const platformTypes: [PlatformType, ...PlatformType[]] = [
  "twitter",
  "linkedin",
  "threads",
];

const MAX_BODY_LENGTH = 3000; // Schema ceiling — per-platform validation via validateBodyForPlatforms

const futureDate = z
  .string()
  .datetime()
  .refine((val) => new Date(val) > new Date(), {
    message: "scheduled_at must be in the future",
  });

export const createPostSchema = z.object({
  body: z.string().min(1).max(MAX_BODY_LENGTH),
  platforms: z.array(z.enum(platformTypes)).min(1),
  scheduled_at: futureDate.optional(),
  media_urls: mediaUrlsSchema.optional(),
  tags: tagsArraySchema.optional(),
  mentions: mentionsArraySchema.optional(),
});

export const updatePostSchema = z.object({
  body: z.string().min(1).max(MAX_BODY_LENGTH).optional(),
  platforms: z.array(z.enum(platformTypes)).min(1).optional(),
  scheduled_at: futureDate.nullable().optional(),
  media_urls: mediaUrlsSchema.nullable().optional(),
  tags: tagsArraySchema.nullable().optional(),
  mentions: mentionsArraySchema.nullable().optional(),
});

export function validateBodyForPlatforms(
  body: string,
  platforms: PlatformType[],
): string | null {
  const limit = getCharLimitForPlatforms(platforms);
  if (body.length > limit) {
    return `Body exceeds ${limit} character limit for selected platforms`;
  }
  return null;
}

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
