// Post events
type PostCreated = {
  data: { postId: string; userId: string };
};

type PostUpdated = {
  data: { postId: string; userId: string; changedFields: string[] };
};

type PostScheduled = {
  data: { postId: string; userId: string; scheduledAt: string };
};

type PostScheduleCancelled = {
  data: { postId: string; userId: string };
};

type PostPublished = {
  data: {
    postId: string;
    userId: string;
    publicationId: string;
    platform: string;
  };
};

type PostPublishFailed = {
  data: {
    postId: string;
    userId: string;
    platform: string;
    error: string;
  };
};

type PostImported = {
  data: { userId: string; postIds: string[]; count: number };
};

// Metrics events
type MetricsFetchRequested = {
  data: {
    publicationId: string;
    userId: string;
    platform: string;
    attempt: number;
  };
};

type MetricsFetchCompleted = {
  data: { publicationId: string; userId: string; metricsId: string };
};

type MetricsFetchFailed = {
  data: { publicationId: string; userId: string; error: string };
};

// Connection events
type ConnectionCreated = {
  data: { userId: string; platform: string; connectionId: string };
};

type ConnectionExpiring = {
  data: {
    userId: string;
    platform: string;
    connectionId: string;
    expiresAt: string;
  };
};

type ConnectionRefreshed = {
  data: { userId: string; platform: string; connectionId: string };
};

// AI events
type AiClassifyRequested = {
  data: { postId: string; userId: string };
};

type AiClassifyCompleted = {
  data: {
    postId: string;
    userId: string;
    intent: string;
    topics: string[];
  };
};

type AiInsightsRequested = {
  data: { userId: string; trigger: string };
};

type AiInsightsCompleted = {
  data: { userId: string; insightIds: string[] };
};

export type Events = {
  "post/created": PostCreated;
  "post/updated": PostUpdated;
  "post/scheduled": PostScheduled;
  "post/schedule.cancelled": PostScheduleCancelled;
  "post/published": PostPublished;
  "post/publish.failed": PostPublishFailed;
  "post/imported": PostImported;
  "metrics/fetch.requested": MetricsFetchRequested;
  "metrics/fetch.completed": MetricsFetchCompleted;
  "metrics/fetch.failed": MetricsFetchFailed;
  "connection/created": ConnectionCreated;
  "connection/expiring": ConnectionExpiring;
  "connection/refreshed": ConnectionRefreshed;
  "ai/classify.requested": AiClassifyRequested;
  "ai/classify.completed": AiClassifyCompleted;
  "ai/insights.requested": AiInsightsRequested;
  "ai/insights.completed": AiInsightsCompleted;
};

export const EVENT_NAMES = {
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
  AI_CLASSIFY_REQUESTED: "ai/classify.requested",
  AI_CLASSIFY_COMPLETED: "ai/classify.completed",
  AI_INSIGHTS_REQUESTED: "ai/insights.requested",
  AI_INSIGHTS_COMPLETED: "ai/insights.completed",
} as const;
