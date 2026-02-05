import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/services/metrics", () => ({
  getPostsNeedingMetricUpdates: vi.fn(),
  insertMetricEvent: vi.fn(),
}));

vi.mock("@/lib/services/connections", () => ({
  getConnectionByPlatform: vi.fn(),
  updateTokens: vi.fn(),
}));

vi.mock("@/lib/adapters", () => ({
  getAdapterForPlatform: vi.fn(),
}));

vi.mock("@/lib/utils/encryption", () => ({
  decrypt: vi.fn((val: string) => `decrypted-${val}`),
}));

import {
  getPostsNeedingMetricUpdates,
  insertMetricEvent,
} from "@/lib/services/metrics";
import { getConnectionByPlatform } from "@/lib/services/connections";
import { getAdapterForPlatform } from "@/lib/adapters";

describe("POST /api/jobs/fetch-metrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
  });

  async function importPOST() {
    const mod = await import("./route");
    return mod.POST;
  }

  it("returns 401 without authorization header", async () => {
    const POST = await importPOST();
    const request = new Request(
      "http://localhost:3000/api/jobs/fetch-metrics",
      { method: "POST" },
    );
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("returns 401 with invalid cron secret", async () => {
    const POST = await importPOST();
    const request = new Request(
      "http://localhost:3000/api/jobs/fetch-metrics",
      {
        method: "POST",
        headers: { Authorization: "Bearer wrong-secret" },
      },
    );
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("returns 200 with valid cron secret and no posts needing updates", async () => {
    vi.mocked(getPostsNeedingMetricUpdates).mockResolvedValue([]);

    const POST = await importPOST();
    const request = new Request(
      "http://localhost:3000/api/jobs/fetch-metrics",
      {
        method: "POST",
        headers: { Authorization: "Bearer test-cron-secret" },
      },
    );
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.processed).toBe(0);
    expect(body.failed).toBe(0);
  });

  it("fetches metrics for published posts and inserts events", async () => {
    const mockPublications = [
      {
        id: "pub-1",
        post_id: "post-1",
        platform: "twitter",
        platform_post_id: "tweet-123",
        published_at: new Date().toISOString(),
        user_id: "user-1",
        posts: {
          user_id: "user-1",
          published_at: new Date().toISOString(),
        },
      },
    ];
    vi.mocked(getPostsNeedingMetricUpdates).mockResolvedValue(
      mockPublications as never,
    );

    vi.mocked(getConnectionByPlatform).mockResolvedValue({
      id: "conn-1",
      access_token_enc: "encrypted-token",
      refresh_token_enc: "encrypted-refresh",
      token_expires_at: new Date(
        Date.now() + 3600000,
      ).toISOString(),
      platform: "twitter",
    } as never);

    const mockAdapter = {
      fetchPostMetrics: vi.fn().mockResolvedValue({
        impressions: 1500,
        likes: 42,
        replies: 7,
        reposts: 12,
        clicks: 25,
        profileVisits: 8,
        observedAt: new Date(),
      }),
    };
    vi.mocked(getAdapterForPlatform).mockReturnValue(mockAdapter as never);
    vi.mocked(insertMetricEvent).mockResolvedValue({ id: "event-1" } as never);

    const POST = await importPOST();
    const request = new Request(
      "http://localhost:3000/api/jobs/fetch-metrics",
      {
        method: "POST",
        headers: { Authorization: "Bearer test-cron-secret" },
      },
    );
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.processed).toBe(1);
    expect(body.failed).toBe(0);

    expect(getAdapterForPlatform).toHaveBeenCalledWith("twitter");
    expect(mockAdapter.fetchPostMetrics).toHaveBeenCalledWith(
      "decrypted-encrypted-token",
      "tweet-123",
    );
    expect(insertMetricEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        postPublicationId: "pub-1",
        userId: "user-1",
        platform: "twitter",
        impressions: 1500,
        likes: 42,
      }),
    );
  });

  it("continues processing when one publication fails", async () => {
    const mockPublications = [
      {
        id: "pub-1",
        post_id: "post-1",
        platform: "twitter",
        platform_post_id: "tweet-111",
        published_at: new Date().toISOString(),
        user_id: "user-1",
        posts: {
          user_id: "user-1",
          published_at: new Date().toISOString(),
        },
      },
      {
        id: "pub-2",
        post_id: "post-2",
        platform: "twitter",
        platform_post_id: "tweet-222",
        published_at: new Date().toISOString(),
        user_id: "user-1",
        posts: {
          user_id: "user-1",
          published_at: new Date().toISOString(),
        },
      },
    ];
    vi.mocked(getPostsNeedingMetricUpdates).mockResolvedValue(
      mockPublications as never,
    );

    vi.mocked(getConnectionByPlatform).mockResolvedValue({
      id: "conn-1",
      access_token_enc: "encrypted-token",
      refresh_token_enc: "encrypted-refresh",
      token_expires_at: new Date(
        Date.now() + 3600000,
      ).toISOString(),
      platform: "twitter",
    } as never);

    const mockAdapter = {
      fetchPostMetrics: vi
        .fn()
        .mockRejectedValueOnce(new Error("API error"))
        .mockResolvedValueOnce({
          impressions: 500,
          likes: 10,
          replies: 2,
          reposts: 3,
          observedAt: new Date(),
        }),
    };
    vi.mocked(getAdapterForPlatform).mockReturnValue(mockAdapter as never);
    vi.mocked(insertMetricEvent).mockResolvedValue({ id: "event-2" } as never);

    const POST = await importPOST();
    const request = new Request(
      "http://localhost:3000/api/jobs/fetch-metrics",
      {
        method: "POST",
        headers: { Authorization: "Bearer test-cron-secret" },
      },
    );
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.processed).toBe(2);
    expect(body.failed).toBe(1);
    expect(insertMetricEvent).toHaveBeenCalledTimes(1);
  });

  it("skips publication when no connection exists", async () => {
    const mockPublications = [
      {
        id: "pub-1",
        post_id: "post-1",
        platform: "twitter",
        platform_post_id: "tweet-123",
        published_at: new Date().toISOString(),
        user_id: "user-1",
        posts: {
          user_id: "user-1",
          published_at: new Date().toISOString(),
        },
      },
    ];
    vi.mocked(getPostsNeedingMetricUpdates).mockResolvedValue(
      mockPublications as never,
    );
    vi.mocked(getConnectionByPlatform).mockResolvedValue(null);

    const POST = await importPOST();
    const request = new Request(
      "http://localhost:3000/api/jobs/fetch-metrics",
      {
        method: "POST",
        headers: { Authorization: "Bearer test-cron-secret" },
      },
    );
    const response = await POST(request);

    const body = await response.json();
    expect(body.processed).toBe(1);
    expect(body.failed).toBe(1);
    expect(insertMetricEvent).not.toHaveBeenCalled();
  });
});
