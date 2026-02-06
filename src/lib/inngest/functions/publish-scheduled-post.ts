import { inngest } from "../client";
import { createAdminClient } from "@/lib/supabase/admin";
import { publishPost } from "@/lib/services/publishing";

export const publishScheduledPost = inngest.createFunction(
  {
    id: "publish-scheduled-post",
    retries: 3,
    concurrency: { limit: 10 },
    cancelOn: [
      {
        event: "post/schedule.cancelled",
        match: "data.postId",
      },
    ],
  },
  { event: "post/scheduled" },
  async ({ event, step }) => {
    const { postId, userId, scheduledAt } = event.data;

    // Sleep until the scheduled publish time
    await step.sleepUntil("wait-until-scheduled", scheduledAt);

    // Verify the post is still in "scheduled" status
    const post = await step.run("verify-still-scheduled", async () => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("posts")
        .select("id, status")
        .eq("id", postId)
        .eq("user_id", userId)
        .single();

      if (error) throw new Error(`Failed to fetch post: ${error.message}`);
      return data;
    });

    if (post.status !== "scheduled") {
      return { cancelled: true, reason: "Post is no longer scheduled" };
    }

    // Publish the post
    const results = await step.run("publish-post", async () => {
      return publishPost(userId, postId);
    });

    // Send events for each platform result
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

    return { published: true, results };
  },
);
