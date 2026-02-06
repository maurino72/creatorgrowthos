import { inngest } from "./client";
import type { PublishResult } from "@/lib/services/publishing";

export async function sendPostCreated(postId: string, userId: string) {
  await inngest.send({
    name: "post/created",
    data: { postId, userId },
  });
}

export async function sendPostScheduled(
  postId: string,
  userId: string,
  scheduledAt: string,
) {
  await inngest.send({
    name: "post/scheduled",
    data: { postId, userId, scheduledAt },
  });
}

export async function sendPostScheduleCancelled(
  postId: string,
  userId: string,
) {
  await inngest.send({
    name: "post/schedule.cancelled",
    data: { postId, userId },
  });
}

export async function sendPostUpdated(
  postId: string,
  userId: string,
  changedFields: string[],
) {
  await inngest.send({
    name: "post/updated",
    data: { postId, userId, changedFields },
  });
}

export async function sendPostPublishResults(
  postId: string,
  userId: string,
  results: PublishResult[],
) {
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

  await inngest.send(events);
}

export async function sendPostImported(
  userId: string,
  postIds: string[],
  count: number,
) {
  await inngest.send({
    name: "post/imported",
    data: { userId, postIds, count },
  });
}

export async function sendConnectionCreated(
  userId: string,
  platform: string,
  connectionId: string,
) {
  await inngest.send({
    name: "connection/created",
    data: { userId, platform, connectionId },
  });
}
