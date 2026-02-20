import { inngest } from "../client";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertMetricEvent, getPublicationsDueForMetrics } from "@/lib/services/metrics";
import { getConnectionByPlatform } from "@/lib/services/connections";
import { getAdapterForPlatform } from "@/lib/adapters";
import { decrypt } from "@/lib/utils/encryption";
import type { PlatformType } from "@/lib/adapters/types";

// On publish: send a single immediate fetch
export const startMetricsCollection = inngest.createFunction(
  { id: "start-metrics-collection" },
  { event: "post/published" },
  async ({ event, step }) => {
    const { publicationId, userId, platform } = event.data;

    await step.sendEvent("immediate-metrics-fetch", {
      name: "metrics/fetch.requested" as const,
      data: {
        publicationId,
        userId,
        platform,
        attempt: 1,
      },
    });

    return { scheduled: 1 };
  },
);

// Cron: every 15 min, find publications due for a fetch and dispatch events
export const collectMetrics = inngest.createFunction(
  { id: "collect-metrics" },
  { cron: "*/15 * * * *" },
  async ({ step }) => {
    const due = await step.run("get-due-publications", async () => {
      return getPublicationsDueForMetrics();
    });

    if (due.length === 0) {
      return { fetched: 0 };
    }

    const events = due.map((pub) => ({
      name: "metrics/fetch.requested" as const,
      data: {
        publicationId: pub.id,
        userId: pub.userId,
        platform: pub.platform,
        attempt: 0,
      },
    }));

    await step.sendEvent("dispatch-metrics-fetches", events);

    return { fetched: due.length };
  },
);

// Individual fetch: called per publication, with retries and concurrency control
export const fetchMetrics = inngest.createFunction(
  {
    id: "fetch-metrics",
    retries: 5,
    concurrency: {
      limit: 5,
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

      if (!connection.access_token_enc) {
        throw new Error(`No access token for ${platform}`);
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
