import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import {
  publishScheduledPost,
  startMetricsCollection,
  collectMetrics,
  fetchMetrics,
  classifyPostFn,
  classifyImportedPosts,
  checkExpiringTokens,
  refreshToken,
  generateWeeklyInsights,
  generateUserInsights,
  cleanupOrphanMedia,
  collectLinkedInMetrics,
  collectTwitterMetrics,
  fetchLinkedInFollowers,
  fetchTwitterFollowers,
  cleanupStaleMetrics,
} from "@/lib/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    publishScheduledPost,
    startMetricsCollection,
    collectMetrics,
    fetchMetrics,
    classifyPostFn,
    classifyImportedPosts,
    checkExpiringTokens,
    refreshToken,
    generateWeeklyInsights,
    generateUserInsights,
    cleanupOrphanMedia,
    collectLinkedInMetrics,
    collectTwitterMetrics,
    fetchLinkedInFollowers,
    fetchTwitterFollowers,
    cleanupStaleMetrics,
  ],
});
