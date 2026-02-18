import { z } from "zod/v4";

export const trendingTopicSchema = z.object({
  topic: z.string().min(1),
  description: z.string().min(1),
  relevance: z.enum(["high", "medium", "low"]),
});

export type TrendingTopic = z.infer<typeof trendingTopicSchema>;

export const trendingTopicsArraySchema = z.array(trendingTopicSchema).min(1).max(10);
