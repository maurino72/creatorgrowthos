import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/services/metrics", () => ({
  insertMetricEvent: vi.fn(),
  getPublicationsDueForMetrics: vi.fn(),
}));

vi.mock("@/lib/services/connections", () => ({
  getConnectionByPlatform: vi.fn(),
}));

vi.mock("@/lib/adapters", () => ({
  getAdapterForPlatform: vi.fn(),
}));

vi.mock("@/lib/utils/encryption", () => ({
  decrypt: vi.fn((val: string) => val.replace("encrypted:", "")),
}));

import {
  startMetricsCollection,
  fetchMetrics,
  collectMetrics,
} from "./metrics";
import { insertMetricEvent, getPublicationsDueForMetrics } from "@/lib/services/metrics";
import { getConnectionByPlatform } from "@/lib/services/connections";
import { getAdapterForPlatform } from "@/lib/adapters";

function createMockStep() {
  return {
    sleep: vi.fn(),
    sleepUntil: vi.fn(),
    run: vi.fn((id: string, fn: () => unknown) => fn()),
    sendEvent: vi.fn(),
  };
}

describe("start-metrics-collection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined as an Inngest function", () => {
    expect(startMetricsCollection).toBeDefined();
  });

  it("sends a single immediate metrics/fetch.requested event on publish", async () => {
    const step = createMockStep();
    const event = {
      name: "post/published" as const,
      data: {
        postId: "post-1",
        userId: "user-1",
        publicationId: "pub-1",
        platform: "twitter",
      },
    };

    const handler = startMetricsCollection["fn"];
    await handler({ event, step } as unknown as Parameters<typeof handler>[0]);

    expect(step.sendEvent).toHaveBeenCalledWith(
      "immediate-metrics-fetch",
      {
        name: "metrics/fetch.requested",
        data: {
          publicationId: "pub-1",
          userId: "user-1",
          platform: "twitter",
          attempt: 1,
        },
      },
    );

    // Should send exactly 1 event, not 11
    expect(step.sendEvent).toHaveBeenCalledTimes(1);
  });
});

describe("collect-metrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined as an Inngest function", () => {
    expect(collectMetrics).toBeDefined();
  });

  it("queries publications due for metrics and sends fetch events", async () => {
    const step = createMockStep();

    const duePublications = [
      {
        id: "pub-1",
        platform: "twitter",
        platformPostId: "tw-123",
        publishedAt: "2025-06-01T12:00:00Z",
        userId: "user-1",
        postId: "post-1",
      },
      {
        id: "pub-2",
        platform: "linkedin",
        platformPostId: "li-456",
        publishedAt: "2025-06-02T10:00:00Z",
        userId: "user-1",
        postId: "post-2",
      },
    ];

    step.run.mockImplementation((id: string, fn: () => unknown) => {
      if (id === "get-due-publications") return duePublications;
      return fn();
    });

    const handler = collectMetrics["fn"];
    await handler({ step } as unknown as Parameters<typeof handler>[0]);

    expect(step.run).toHaveBeenCalledWith("get-due-publications", expect.any(Function));

    expect(step.sendEvent).toHaveBeenCalledWith(
      "dispatch-metrics-fetches",
      [
        {
          name: "metrics/fetch.requested",
          data: {
            publicationId: "pub-1",
            userId: "user-1",
            platform: "twitter",
            attempt: 0,
          },
        },
        {
          name: "metrics/fetch.requested",
          data: {
            publicationId: "pub-2",
            userId: "user-1",
            platform: "linkedin",
            attempt: 0,
          },
        },
      ],
    );
  });

  it("does not send events when no publications are due", async () => {
    const step = createMockStep();

    step.run.mockImplementation((id: string, fn: () => unknown) => {
      if (id === "get-due-publications") return [];
      return fn();
    });

    const handler = collectMetrics["fn"];
    await handler({ step } as unknown as Parameters<typeof handler>[0]);

    expect(step.sendEvent).not.toHaveBeenCalled();
  });
});

describe("fetch-metrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined as an Inngest function", () => {
    expect(fetchMetrics).toBeDefined();
  });

  it("fetches metrics from platform and inserts metric event", async () => {
    const step = createMockStep();
    const event = {
      name: "metrics/fetch.requested" as const,
      data: {
        publicationId: "pub-1",
        userId: "user-1",
        platform: "twitter",
        attempt: 1,
      },
    };

    vi.mocked(getConnectionByPlatform).mockResolvedValue({
      id: "conn-1",
      access_token_enc: "encrypted:token-123",
      platform: "twitter",
      status: "active",
      platform_user_id: "tw-user",
      platform_username: "testuser",
      connected_at: "2025-01-01",
    } as unknown as Awaited<ReturnType<typeof getConnectionByPlatform>>);

    const mockAdapter = {
      fetchPostMetrics: vi.fn().mockResolvedValue({
        impressions: 1000,
        likes: 50,
        replies: 10,
        reposts: 5,
        clicks: 20,
        profileVisits: 3,
        followsFromPost: 1,
      }),
    };
    vi.mocked(getAdapterForPlatform).mockReturnValue(mockAdapter as unknown as ReturnType<typeof getAdapterForPlatform>);

    // Mock step.run to return publication data on first call
    step.run.mockImplementation((id: string, fn: () => unknown) => {
      if (id === "get-publication") {
        return {
          platform_post_id: "tw-post-123",
          published_at: "2025-06-01T12:00:00Z",
          user_id: "user-1",
        };
      }
      return fn();
    });

    const handler = fetchMetrics["fn"];
    await handler({ event, step } as unknown as Parameters<typeof handler>[0]);

    expect(step.run).toHaveBeenCalledWith("get-publication", expect.any(Function));
    expect(step.run).toHaveBeenCalledWith("fetch-platform-metrics", expect.any(Function));
    expect(step.run).toHaveBeenCalledWith("insert-metric-event", expect.any(Function));

    expect(step.sendEvent).toHaveBeenCalledWith(
      "send-completion",
      expect.objectContaining({
        name: "metrics/fetch.completed",
        data: expect.objectContaining({
          publicationId: "pub-1",
          userId: "user-1",
        }),
      }),
    );
  });

  it("throws when no connection found for platform", async () => {
    const step = createMockStep();
    const event = {
      name: "metrics/fetch.requested" as const,
      data: {
        publicationId: "pub-1",
        userId: "user-1",
        platform: "twitter",
        attempt: 1,
      },
    };

    step.run.mockImplementation((id: string, fn: () => unknown) => {
      if (id === "get-publication") {
        return {
          platform_post_id: "tw-post-123",
          published_at: "2025-06-01T12:00:00Z",
          user_id: "user-1",
        };
      }
      return fn();
    });

    vi.mocked(getConnectionByPlatform).mockResolvedValue(null);

    const handler = fetchMetrics["fn"];
    await expect(
      handler({ event, step } as unknown as Parameters<typeof handler>[0]),
    ).rejects.toThrow("No active connection");
  });
});
