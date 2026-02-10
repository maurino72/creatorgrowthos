import { inngest } from "../client";
import { createAdminClient } from "@/lib/supabase/admin";
import { publishPost } from "@/lib/services/publishing";

export const publishScheduledPost = inngest.createFunction(
  {
    id: "publish-scheduled-post",
    retries: 3,
    concurrency: { limit: 5 },
    cancelOn: [
      {
        event: "post/schedule.cancelled",
        match: "data.postId",
      },
    ],
  },
  { event: "post/scheduled" },
  async ({ event, step, logger }) => {
    const { postId, userId, scheduledAt } = event.data;

    logger.info("Sleeping until scheduled time", { postId, userId, scheduledAt });
    await step.sleepUntil("wait-until-scheduled", scheduledAt);

    logger.info("Woke up, verifying post still scheduled", { postId });
    const post = await step.run("verify-still-scheduled", async () => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("posts")
        .select("id, status, scheduled_at")
        .eq("id", postId)
        .eq("user_id", userId)
        .single();

      if (error) throw new Error(`Failed to fetch post: ${error.message}`);
      return data;
    });

    if (post.status !== "scheduled") {
      logger.info("Post no longer scheduled, aborting", { postId, status: post.status });
      return { cancelled: true, reason: "Post is no longer scheduled" };
    }

    if (!post.scheduled_at || new Date(post.scheduled_at).getTime() !== new Date(scheduledAt).getTime()) {
      logger.info("Schedule was changed, aborting", { postId, expected: scheduledAt, actual: post.scheduled_at });
      return { cancelled: true, reason: "Schedule was changed" };
    }

    logger.info("Publishing post", { postId });
    const results = await step.run("publish-post", async () => {
      return publishPost(userId, postId);
    });

    const events = results.map((result) => {
      if (result.success) {
        return {
          name: "post/published" as const,
          data: {
            postId,
            userId,
            publicationId: result.platformPostId ?? "",
            platform: result.platform,
          },
        };
      }
      return {
        name: "post/publish.failed" as const,
        data: {
          postId,
          userId,
          platform: result.platform,
          error: result.error ?? "Unknown error",
        },
      };
    });

    await step.sendEvent("send-publish-results", events);

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    logger.info("Publish complete", { postId, succeeded, failed });

    return { published: true, results };
  },
);
