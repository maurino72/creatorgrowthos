import { z } from "zod";

export const MIN_POLL_OPTIONS = 2;
export const MAX_POLL_OPTIONS = 4;
export const MAX_POLL_OPTION_LENGTH = 25;
export const MIN_POLL_DURATION_MINUTES = 5;
export const MAX_POLL_DURATION_MINUTES = 10080; // 7 days

export const pollSchema = z.object({
  options: z
    .array(z.string().min(1).max(MAX_POLL_OPTION_LENGTH))
    .min(MIN_POLL_OPTIONS)
    .max(MAX_POLL_OPTIONS),
  duration_minutes: z
    .number()
    .int()
    .min(MIN_POLL_DURATION_MINUTES)
    .max(MAX_POLL_DURATION_MINUTES),
});

export type PollInput = z.infer<typeof pollSchema>;
