import { z } from "zod";

export const REPLY_SETTINGS = [
  "everyone",
  "mentioned_users",
  "following",
  "subscribers",
  "verified_users",
] as const;

export type ReplySettings = (typeof REPLY_SETTINGS)[number];

export const replySettingsSchema = z.enum(REPLY_SETTINGS);
