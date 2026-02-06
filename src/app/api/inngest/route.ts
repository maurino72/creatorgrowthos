import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import {
  publishScheduledPost,
  startMetricsCollection,
  fetchMetrics,
  classifyPostFn,
  classifyImportedPosts,
  checkExpiringTokens,
  refreshToken,
  generateWeeklyInsights,
  generateUserInsights,
  cleanupOrphanMedia,
} from "@/lib/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    publishScheduledPost,
    startMetricsCollection,
    fetchMetrics,
    classifyPostFn,
    classifyImportedPosts,
    checkExpiringTokens,
    refreshToken,
    generateWeeklyInsights,
    generateUserInsights,
    cleanupOrphanMedia,
  ],
});
