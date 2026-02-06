import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/services/metrics", () => ({
  insertMetricEvent: vi.fn(),
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

import { startMetricsCollection, fetchMetrics } from "./metrics";
import { insertMetricEvent } from "@/lib/services/metrics";
import { getConnectionByPlatform } from "@/lib/services/connections";
import { getAdapterForPlatform } from "@/lib/adapters";
import { decrypt } from "@/lib/utils/encryption";

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

  it("sends metrics fetch events for the full schedule after publish", async () => {
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

    // Should send batch of metrics/fetch.requested events for the full schedule
    expect(step.sendEvent).toHaveBeenCalledWith(
      "schedule-metrics-fetches",
      expect.arrayContaining([
        expect.objectContaining({
          name: "metrics/fetch.requested",
          data: expect.objectContaining({
            publicationId: "pub-1",
            userId: "user-1",
            platform: "twitter",
          }),
        }),
      ]),
    );

    // Should include events for all scheduled times (11 total: T+0 through T+30d)
    const sentEvents = step.sendEvent.mock.calls[0][1];
    expect(sentEvents).toHaveLength(11);
  });

  it("includes attempt number in each scheduled event", async () => {
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

    const sentEvents = step.sendEvent.mock.calls[0][1];
    sentEvents.forEach((evt: { data: { attempt: number } }, i: number) => {
      expect(evt.data.attempt).toBe(i + 1);
    });
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
    } as ReturnType<Awaited<typeof getConnectionByPlatform>>);

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
    let callIndex = 0;
    step.run.mockImplementation((id: string, fn: () => unknown) => {
      callIndex++;
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

    // Should fetch publication data
    expect(step.run).toHaveBeenCalledWith("get-publication", expect.any(Function));

    // Should fetch metrics
    expect(step.run).toHaveBeenCalledWith("fetch-platform-metrics", expect.any(Function));

    // Should insert metric event
    expect(step.run).toHaveBeenCalledWith("insert-metric-event", expect.any(Function));

    // Should send completion event
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
