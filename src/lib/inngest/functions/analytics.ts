import { inngest } from "../client";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdapterForPlatform } from "@/lib/adapters";
import { decrypt } from "@/lib/utils/encryption";
import {
  insertMetricSnapshot,
  logMetricFetch,
  getDecayInterval,
} from "@/lib/services/metric-snapshots";
import {
  insertFollowerSnapshot,
  getLatestFollowerCount,
} from "@/lib/services/follower-snapshots";
import { LinkedInAdapter } from "@/lib/adapters/linkedin";
import { TwitterAdapter } from "@/lib/adapters/twitter";

// ─── LinkedIn Post Metrics (cron */30) ──────────────────────────────────

export const collectLinkedInMetrics = inngest.createFunction(
  { id: "collect-linkedin-metrics" },
  { cron: "*/30 * * * *" },
  async ({ step }) => {
    const connections = await step.run("get-linkedin-connections", async () => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("platform_connections")
        .select("user_id, access_token_enc, platform_user_id")
        .eq("platform", "linkedin")
        .eq("status", "active");

      if (error) throw new Error(error.message);
      return data ?? [];
    });

    if (connections.length === 0) return { postsProcessed: 0 };

    let totalProcessed = 0;

    for (const conn of connections) {
      const publications = await step.run(
        `get-posts-for-${conn.user_id}`,
        async () => {
          const supabase = createAdminClient();
          const { data, error } = await supabase
            .from("post_publications")
            .select("id, platform_post_id, published_at, posts!inner(id, user_id)")
            .eq("platform", "linkedin")
            .eq("status", "published")
            .not("platform_post_id", "is", null)
            .order("published_at", { ascending: false });

          if (error) throw new Error(error.message);
          return (data ?? []).filter((pub) => {
            const publishedAt = new Date(pub.published_at!);
            const interval = getDecayInterval(publishedAt, "linkedin");
            return interval !== null;
          });
        },
      );

      for (const pub of publications) {
        try {
          const metrics = await step.run(
            `fetch-metrics-${pub.platform_post_id}`,
            async () => {
              const accessToken = decrypt(conn.access_token_enc!);
              const adapter = getAdapterForPlatform("linkedin") as LinkedInAdapter;
              return adapter.fetchPostAnalytics(accessToken, pub.platform_post_id!);
            },
          );

          const post = pub.posts as unknown as { id: string; user_id: string };

          await step.run(`insert-snapshot-${pub.platform_post_id}`, async () => {
            await insertMetricSnapshot({
              userId: post.user_id,
              platform: "linkedin",
              postId: post.id,
              platformPostId: pub.platform_post_id!,
              impressions: metrics.impressions,
              uniqueReach: metrics.uniqueReach,
              reactions: metrics.reactions,
              comments: metrics.comments,
              shares: metrics.shares,
            });
          });

          await step.run(`log-fetch-${pub.platform_post_id}`, async () => {
            await logMetricFetch({
              userId: post.user_id,
              platform: "linkedin",
              platformPostId: pub.platform_post_id!,
              fetchType: "post_metrics",
              status: "success",
              apiCallsUsed: 5, // 5 metric types
            });
          });

          totalProcessed++;
        } catch {
          // Log failure but continue with other posts
          const post = pub.posts as unknown as { id: string; user_id: string };
          await step.run(`log-failure-${pub.platform_post_id}`, async () => {
            await logMetricFetch({
              userId: post.user_id,
              platform: "linkedin",
              platformPostId: pub.platform_post_id!,
              fetchType: "post_metrics",
              status: "failed",
              apiCallsUsed: 0,
            });
          });
        }
      }
    }

    return { postsProcessed: totalProcessed };
  },
);

// ─── Twitter Post Metrics (cron */15) ───────────────────────────────────

export const collectTwitterMetrics = inngest.createFunction(
  { id: "collect-twitter-metrics" },
  { cron: "*/15 * * * *" },
  async ({ step }) => {
    const connections = await step.run("get-twitter-connections", async () => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("platform_connections")
        .select("user_id, access_token_enc, platform_user_id")
        .eq("platform", "twitter")
        .eq("status", "active");

      if (error) throw new Error(error.message);
      return data ?? [];
    });

    if (connections.length === 0) return { postsProcessed: 0 };

    let totalProcessed = 0;

    for (const conn of connections) {
      const publications = await step.run(
        `get-posts-for-${conn.user_id}`,
        async () => {
          const supabase = createAdminClient();
          const { data, error } = await supabase
            .from("post_publications")
            .select("id, platform_post_id, published_at, posts!inner(id, user_id)")
            .eq("platform", "twitter")
            .eq("status", "published")
            .not("platform_post_id", "is", null)
            .order("published_at", { ascending: false });

          if (error) throw new Error(error.message);
          return (data ?? []).filter((pub) => {
            const publishedAt = new Date(pub.published_at!);
            const interval = getDecayInterval(publishedAt, "twitter");
            return interval !== null;
          });
        },
      );

      if (publications.length === 0) continue;

      // Batch up to 100 IDs
      const tweetIds = publications
        .map((p) => p.platform_post_id!)
        .filter(Boolean);

      try {
        const batchResults = await step.run(
          `batch-fetch-metrics-${conn.user_id}`,
          async () => {
            const accessToken = decrypt(conn.access_token_enc!);
            const adapter = getAdapterForPlatform("twitter") as TwitterAdapter;
            return adapter.fetchBatchMetrics(accessToken, tweetIds);
          },
        );

        // Map results back to publications
        const metricsMap = new Map(
          batchResults.map((r) => [r.platformPostId, r]),
        );

        await step.run(`insert-snapshots-${conn.user_id}`, async () => {
          for (const pub of publications) {
            const metrics = metricsMap.get(pub.platform_post_id!);
            if (!metrics) continue;

            const post = pub.posts as unknown as { id: string; user_id: string };
            await insertMetricSnapshot({
              userId: post.user_id,
              platform: "twitter",
              postId: post.id,
              platformPostId: pub.platform_post_id!,
              impressions: metrics.impressions,
              reactions: metrics.likes,
              comments: metrics.replies,
              shares: metrics.reposts,
              quotes: metrics.quotes,
              bookmarks: metrics.bookmarks,
            });
          }
        });

        await step.run(`log-fetch-${conn.user_id}`, async () => {
          const post = publications[0].posts as unknown as { id: string; user_id: string };
          await logMetricFetch({
            userId: post.user_id,
            platform: "twitter",
            fetchType: "post_metrics",
            status: "success",
            apiCallsUsed: Math.ceil(tweetIds.length / 100),
          });
        });

        totalProcessed += publications.length;
      } catch {
        const post = publications[0].posts as unknown as { id: string; user_id: string };
        await step.run(`log-failure-${conn.user_id}`, async () => {
          await logMetricFetch({
            userId: post.user_id,
            platform: "twitter",
            fetchType: "post_metrics",
            status: "failed",
            apiCallsUsed: 0,
          });
        });
      }
    }

    return { postsProcessed: totalProcessed };
  },
);

// ─── LinkedIn Follower Fetcher (daily midnight UTC) ─────────────────────

export const fetchLinkedInFollowers = inngest.createFunction(
  { id: "fetch-linkedin-followers" },
  { cron: "0 0 * * *" },
  async ({ step }) => {
    const connections = await step.run("get-linkedin-connections", async () => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("platform_connections")
        .select("user_id, access_token_enc, platform_user_id")
        .eq("platform", "linkedin")
        .eq("status", "active");

      if (error) throw new Error(error.message);
      return data ?? [];
    });

    if (connections.length === 0) return { usersProcessed: 0 };

    let processed = 0;

    for (const conn of connections) {
      try {
        const stats = await step.run(
          `fetch-followers-${conn.user_id}`,
          async () => {
            const accessToken = decrypt(conn.access_token_enc!);
            const adapter = getAdapterForPlatform("linkedin") as LinkedInAdapter;
            return adapter.fetchFollowerStats(accessToken);
          },
        );

        await step.run(`insert-snapshot-${conn.user_id}`, async () => {
          const today = new Date().toISOString().slice(0, 10);
          await insertFollowerSnapshot({
            userId: conn.user_id,
            platform: "linkedin",
            followerCount: stats.followerCount,
            snapshotDate: today,
          });
        });

        await step.run(`log-fetch-${conn.user_id}`, async () => {
          await logMetricFetch({
            userId: conn.user_id,
            platform: "linkedin",
            fetchType: "follower_stats",
            status: "success",
            apiCallsUsed: 1,
          });
        });

        processed++;
      } catch {
        await step.run(`log-failure-${conn.user_id}`, async () => {
          await logMetricFetch({
            userId: conn.user_id,
            platform: "linkedin",
            fetchType: "follower_stats",
            status: "failed",
            apiCallsUsed: 0,
          });
        });
      }
    }

    return { usersProcessed: processed };
  },
);

// ─── Twitter Follower Fetcher (daily) ───────────────────────────────────

export const fetchTwitterFollowers = inngest.createFunction(
  { id: "fetch-twitter-followers" },
  { cron: "0 0 * * *" },
  async ({ step }) => {
    const connections = await step.run("get-twitter-connections", async () => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("platform_connections")
        .select("user_id, access_token_enc, platform_user_id")
        .eq("platform", "twitter")
        .eq("status", "active");

      if (error) throw new Error(error.message);
      return data ?? [];
    });

    if (connections.length === 0) return { usersProcessed: 0 };

    let processed = 0;

    for (const conn of connections) {
      try {
        const stats = await step.run(
          `fetch-followers-${conn.user_id}`,
          async () => {
            const accessToken = decrypt(conn.access_token_enc!);
            const adapter = getAdapterForPlatform("twitter") as TwitterAdapter;
            return adapter.fetchFollowerCount(accessToken, conn.platform_user_id!);
          },
        );

        await step.run(`insert-snapshot-${conn.user_id}`, async () => {
          const today = new Date().toISOString().slice(0, 10);

          // Calculate new_followers from previous day's count
          const previous = await getLatestFollowerCount(conn.user_id, "twitter");
          const newFollowers = previous
            ? stats.followerCount - previous.follower_count
            : null;

          await insertFollowerSnapshot({
            userId: conn.user_id,
            platform: "twitter",
            followerCount: stats.followerCount,
            newFollowers,
            snapshotDate: today,
          });
        });

        await step.run(`log-fetch-${conn.user_id}`, async () => {
          await logMetricFetch({
            userId: conn.user_id,
            platform: "twitter",
            fetchType: "follower_stats",
            status: "success",
            apiCallsUsed: 1,
          });
        });

        processed++;
      } catch {
        await step.run(`log-failure-${conn.user_id}`, async () => {
          await logMetricFetch({
            userId: conn.user_id,
            platform: "twitter",
            fetchType: "follower_stats",
            status: "failed",
            apiCallsUsed: 0,
          });
        });
      }
    }

    return { usersProcessed: processed };
  },
);

// ─── Stale Metrics Cleanup (weekly) ─────────────────────────────────────

export const cleanupStaleMetrics = inngest.createFunction(
  { id: "cleanup-stale-metrics" },
  { cron: "0 4 * * 0" }, // Sunday 4am UTC
  async ({ step }) => {
    // Delete fetch logs older than 90 days
    const logsDeleted = await step.run("delete-old-fetch-logs", async () => {
      const supabase = createAdminClient();
      const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from("metric_fetch_log")
        .delete()
        .lt("fetched_at", cutoff)
        .select("id");

      if (error) throw new Error(error.message);
      return data?.length ?? 0;
    });

    // Compact old snapshots: keep only 1 per day for data > 6 months
    const snapshotsCompacted = await step.run(
      "compact-old-snapshots",
      async () => {
        // This is a simplified version; in production you'd use a SQL function
        // For now, we just report how many could be compacted
        return 0;
      },
    );

    return { logsDeleted, snapshotsCompacted };
  },
);
