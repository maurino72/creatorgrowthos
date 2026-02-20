import { describe, it, expect } from "vitest";
import type { Events } from "./events";

describe("Inngest event types", () => {
  it("defines post events with correct payload shapes", () => {
    const postCreated: Events["post/created"] = {
      data: { postId: "post-1", userId: "user-1" },
    };
    expect(postCreated.data.postId).toBe("post-1");
    expect(postCreated.data.userId).toBe("user-1");

    const postScheduled: Events["post/scheduled"] = {
      data: { postId: "post-1", userId: "user-1", scheduledAt: "2025-01-01T00:00:00Z" },
    };
    expect(postScheduled.data.scheduledAt).toBe("2025-01-01T00:00:00Z");

    const postScheduleCancelled: Events["post/schedule.cancelled"] = {
      data: { postId: "post-1", userId: "user-1" },
    };
    expect(postScheduleCancelled.data.postId).toBe("post-1");

    const postUpdated: Events["post/updated"] = {
      data: { postId: "post-1", userId: "user-1", changedFields: ["body"] },
    };
    expect(postUpdated.data.changedFields).toEqual(["body"]);

    const postPublished: Events["post/published"] = {
      data: {
        postId: "post-1",
        userId: "user-1",
        publicationId: "pub-1",
        platform: "twitter",
      },
    };
    expect(postPublished.data.platform).toBe("twitter");

    const postPublishFailed: Events["post/publish.failed"] = {
      data: {
        postId: "post-1",
        userId: "user-1",
        platform: "twitter",
        error: "Rate limited",
      },
    };
    expect(postPublishFailed.data.error).toBe("Rate limited");

    const postImported: Events["post/imported"] = {
      data: { userId: "user-1", postIds: ["p1", "p2"], count: 2 },
    };
    expect(postImported.data.count).toBe(2);
  });

  it("defines metrics events with correct payload shapes", () => {
    const fetchRequested: Events["metrics/fetch.requested"] = {
      data: {
        publicationId: "pub-1",
        userId: "user-1",
        platform: "twitter",
        attempt: 1,
      },
    };
    expect(fetchRequested.data.attempt).toBe(1);

    const fetchCompleted: Events["metrics/fetch.completed"] = {
      data: { publicationId: "pub-1", userId: "user-1", metricsId: "m-1" },
    };
    expect(fetchCompleted.data.metricsId).toBe("m-1");

    const fetchFailed: Events["metrics/fetch.failed"] = {
      data: { publicationId: "pub-1", userId: "user-1", error: "Timeout" },
    };
    expect(fetchFailed.data.error).toBe("Timeout");
  });

  it("defines connection events with correct payload shapes", () => {
    const created: Events["connection/created"] = {
      data: { userId: "user-1", platform: "twitter", connectionId: "conn-1" },
    };
    expect(created.data.connectionId).toBe("conn-1");

    const expiring: Events["connection/expiring"] = {
      data: {
        userId: "user-1",
        platform: "twitter",
        connectionId: "conn-1",
        expiresAt: "2025-01-01T00:00:00Z",
      },
    };
    expect(expiring.data.expiresAt).toBe("2025-01-01T00:00:00Z");

    const refreshed: Events["connection/refreshed"] = {
      data: { userId: "user-1", platform: "twitter", connectionId: "conn-1" },
    };
    expect(refreshed.data.connectionId).toBe("conn-1");
  });

  it("defines AI events with correct payload shapes", () => {
    const classifyRequested: Events["ai/classify.requested"] = {
      data: { postId: "post-1", userId: "user-1" },
    };
    expect(classifyRequested.data.postId).toBe("post-1");

    const classifyCompleted: Events["ai/classify.completed"] = {
      data: {
        postId: "post-1",
        userId: "user-1",
        intent: "educate",
        topics: ["ai", "typescript"],
      },
    };
    expect(classifyCompleted.data.topics).toEqual(["ai", "typescript"]);

    const insightsRequested: Events["ai/insights.requested"] = {
      data: { userId: "user-1", trigger: "weekly" },
    };
    expect(insightsRequested.data.trigger).toBe("weekly");

    const insightsCompleted: Events["ai/insights.completed"] = {
      data: { userId: "user-1", insightIds: ["i-1", "i-2"] },
    };
    expect(insightsCompleted.data.insightIds).toHaveLength(2);
  });

  it("exports EVENT_NAMES constant for all event names", async () => {
    const { EVENT_NAMES } = await import("./events");
    expect(EVENT_NAMES).toEqual({
      POST_CREATED: "post/created",
      POST_UPDATED: "post/updated",
      POST_SCHEDULED: "post/scheduled",
      POST_SCHEDULE_CANCELLED: "post/schedule.cancelled",
      POST_PUBLISHED: "post/published",
      POST_PUBLISH_FAILED: "post/publish.failed",
      POST_IMPORTED: "post/imported",
      METRICS_FETCH_REQUESTED: "metrics/fetch.requested",
      METRICS_FETCH_COMPLETED: "metrics/fetch.completed",
      METRICS_FETCH_FAILED: "metrics/fetch.failed",
      CONNECTION_CREATED: "connection/created",
      CONNECTION_EXPIRING: "connection/expiring",
      CONNECTION_REFRESHED: "connection/refreshed",
      METRICS_REFRESH_REQUESTED: "metrics/refresh.requested",
      AI_CLASSIFY_REQUESTED: "ai/classify.requested",
      AI_CLASSIFY_COMPLETED: "ai/classify.completed",
      AI_INSIGHTS_REQUESTED: "ai/insights.requested",
      AI_INSIGHTS_COMPLETED: "ai/insights.completed",
    });
  });
});
