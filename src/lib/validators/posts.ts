import { z } from "zod";
import type { PlatformType } from "@/lib/adapters/types";
import { mediaUrlsSchema } from "./media";
import { tagsArraySchema } from "./tags";

const platformTypes: [PlatformType, ...PlatformType[]] = [
  "twitter",
  "linkedin",
  "threads",
];

const futureDate = z
  .string()
  .datetime()
  .refine((val) => new Date(val) > new Date(), {
    message: "scheduled_at must be in the future",
  });

export const createPostSchema = z.object({
  body: z.string().min(1).max(280),
  platforms: z.array(z.enum(platformTypes)).min(1),
  scheduled_at: futureDate.optional(),
  media_urls: mediaUrlsSchema.optional(),
  tags: tagsArraySchema.optional(),
});

export const updatePostSchema = z.object({
  body: z.string().min(1).max(280).optional(),
  platforms: z.array(z.enum(platformTypes)).min(1).optional(),
  scheduled_at: futureDate.nullable().optional(),
  media_urls: mediaUrlsSchema.nullable().optional(),
  tags: tagsArraySchema.nullable().optional(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
