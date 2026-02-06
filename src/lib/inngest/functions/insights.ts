import { inngest } from "../client";
import {
  getEligibleUsersForInsights,
  generateInsights,
} from "@/lib/services/insights";

export const generateWeeklyInsights = inngest.createFunction(
  { id: "generate-weekly-insights" },
  { cron: "0 9 * * 1" }, // Every Monday at 9am UTC
  async ({ step }) => {
    const userIds = await step.run("get-eligible-users", async () => {
      return getEligibleUsersForInsights();
    });

    if (userIds.length === 0) {
      return { eligible: 0 };
    }

    const events = userIds.map((userId) => ({
      name: "ai/insights.requested" as const,
      data: { userId, trigger: "weekly" },
    }));

    await step.sendEvent("fan-out-insights", events);

    return { eligible: userIds.length };
  },
);

export const generateUserInsights = inngest.createFunction(
  {
    id: "generate-user-insights",
    retries: 3,
    concurrency: { limit: 5 },
    throttle: {
      limit: 20,
      period: "1m",
    },
  },
  { event: "ai/insights.requested" },
  async ({ event, step }) => {
    const { userId } = event.data;

    const insights = await step.run("generate", async () => {
      return generateInsights(userId);
    });

    const insightIds = insights.map((i) => i.id);

    await step.sendEvent("send-completion", {
      name: "ai/insights.completed" as const,
      data: {
        userId,
        insightIds,
      },
    });

    return { generated: insights.length };
  },
);
