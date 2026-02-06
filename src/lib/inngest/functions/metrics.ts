import { inngest } from "../client";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertMetricEvent } from "@/lib/services/metrics";
import { getConnectionByPlatform } from "@/lib/services/connections";
import { getAdapterForPlatform } from "@/lib/adapters";
import { decrypt } from "@/lib/utils/encryption";
import type { PlatformType } from "@/lib/adapters/types";

// Metrics collection schedule (milliseconds after publish)
const METRICS_SCHEDULE_MS = [
  0,                        // T+0: immediate
  1 * 60 * 60 * 1000,      // T+1h
  2 * 60 * 60 * 1000,      // T+2h
  4 * 60 * 60 * 1000,      // T+4h
  8 * 60 * 60 * 1000,      // T+8h
  24 * 60 * 60 * 1000,     // T+24h
  48 * 60 * 60 * 1000,     // T+48h
  72 * 60 * 60 * 1000,     // T+72h
  7 * 24 * 60 * 60 * 1000, // T+7d
  14 * 24 * 60 * 60 * 1000, // T+14d
  30 * 24 * 60 * 60 * 1000, // T+30d
];

export const startMetricsCollection = inngest.createFunction(
  { id: "start-metrics-collection" },
  { event: "post/published" },
  async ({ event, step }) => {
    const { publicationId, userId, platform } = event.data;
    const now = Date.now();

    const events = METRICS_SCHEDULE_MS.map((delayMs, index) => ({
      name: "metrics/fetch.requested" as const,
      data: {
        publicationId,
        userId,
        platform,
        attempt: index + 1,
      },
      ts: now + delayMs,
    }));

    await step.sendEvent("schedule-metrics-fetches", events);

    return { scheduled: events.length };
  },
);

export const fetchMetrics = inngest.createFunction(
  {
    id: "fetch-metrics",
    retries: 5,
    concurrency: {
      limit: 10,
      key: "event.data.userId",
    },
    throttle: {
      limit: 50,
      period: "15m",
    },
  },
  { event: "metrics/fetch.requested" },
  async ({ event, step }) => {
    const { publicationId, userId, platform } = event.data;

    // Fetch publication data
    const publication = await step.run("get-publication", async () => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("post_publications")
        .select("platform_post_id, published_at, user_id")
        .eq("id", publicationId)
        .single();

      if (error) throw new Error(`Publication not found: ${error.message}`);
      return data;
    });

    // Fetch metrics from platform
    const metrics = await step.run("fetch-platform-metrics", async () => {
      const connection = await getConnectionByPlatform(userId, platform as PlatformType);
      if (!connection) {
        throw new Error(`No active connection for ${platform}`);
      }

      const accessToken = decrypt(connection.access_token_enc);
      const adapter = getAdapterForPlatform(platform as PlatformType);
      return adapter.fetchPostMetrics(accessToken, publication.platform_post_id!);
    });

    // Insert metric event
    await step.run("insert-metric-event", async () => {
      await insertMetricEvent({
        postPublicationId: publicationId,
        userId,
        platform: platform as PlatformType,
        impressions: metrics.impressions,
        likes: metrics.likes,
        replies: metrics.replies,
        reposts: metrics.reposts,
        clicks: metrics.clicks,
        profileVisits: metrics.profileVisits,
        followsFromPost: metrics.followsFromPost,
        publishedAt: new Date(publication.published_at!),
      });
    });

    // Send completion event
    await step.sendEvent("send-completion", {
      name: "metrics/fetch.completed" as const,
      data: {
        publicationId,
        userId,
        metricsId: publicationId,
      },
    });

    return { success: true };
  },
);
