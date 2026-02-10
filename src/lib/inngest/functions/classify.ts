import { inngest } from "../client";
import { classifyPost } from "@/lib/services/classification";

export const classifyPostFn = inngest.createFunction(
  {
    id: "classify-post",
    retries: 3,
    concurrency: { limit: 5 },
    throttle: {
      limit: 100,
      period: "1m",
    },
  },
  [{ event: "ai/classify.requested" }, { event: "post/created" }],
  async ({ event, step }) => {
    const { postId, userId } = event.data;

    const result = await step.run("classify", async () => {
      return classifyPost(userId, postId);
    });

    await step.sendEvent("send-completion", {
      name: "ai/classify.completed" as const,
      data: {
        postId,
        userId,
        intent: result.intent,
        topics: result.topics,
      },
    });

    return { classified: true, intent: result.intent };
  },
);

export const classifyImportedPosts = inngest.createFunction(
  {
    id: "classify-imported-posts",
    concurrency: { limit: 3 },
  },
  { event: "post/imported" },
  async ({ event, step }) => {
    const { userId, postIds } = event.data;

    const events = postIds.map((postId) => ({
      name: "ai/classify.requested" as const,
      data: { postId, userId },
    }));

    await step.sendEvent("fan-out-classify", events);

    return { dispatched: postIds.length };
  },
);
