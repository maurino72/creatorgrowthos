import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import {
  getAggregatedData,
  type InsightContext,
  type PerformanceByCategory,
} from "./aggregation";

function createMockPosts(count: number, overrides: Partial<Record<string, unknown>>[] = []) {
  return Array.from({ length: count }, (_, i) => ({
    id: `post-${i + 1}`,
    user_id: "user-1",
    body: `Post body ${i + 1}`,
    status: "published",
    intent: ["educate", "engage", "promote"][i % 3],
    content_type: ["single", "thread"][i % 2],
    topics: [["ai", "saas"], ["startup", "marketing"], ["ai"]][i % 3],
    published_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
    post_publications: [
      {
        id: `pub-${i + 1}`,
        platform: "twitter",
        status: "published",
        metric_events: [
          {
            impressions: 1000 + i * 100,
            likes: 20 + i * 5,
            replies: 5 + i,
            reposts: 3 + i,
            engagement_rate: (20 + i * 5 + 5 + i + 3 + i) / (1000 + i * 100),
            observed_at: new Date(Date.now() - i * 12 * 60 * 60 * 1000).toISOString(),
          },
        ],
      },
    ],
    ...overrides[i],
  }));
}

function mockSupabaseQuery(data: unknown[] | null, error: { message: string } | null = null) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    then: undefined as unknown,
  };
  // Make it resolve like a promise-returning query
  const result = { data, error };
  chain.order = vi.fn().mockReturnValue(result);
  chain.from = vi.fn().mockReturnValue(chain);
  vi.mocked(createAdminClient).mockReturnValue(chain as never);
  return chain;
}

describe("getAggregatedData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns structured InsightContext with creator summary", async () => {
    const posts = createMockPosts(25);
    mockSupabaseQuery(posts);

    const result = await getAggregatedData("user-1");

    expect(result.creatorSummary.totalPosts).toBe(25);
    expect(result.creatorSummary.platforms).toContain("twitter");
  });

  it("calculates performance by intent", async () => {
    const posts = createMockPosts(25);
    mockSupabaseQuery(posts);

    const result = await getAggregatedData("user-1");

    expect(result.byIntent).toBeDefined();
    expect(Object.keys(result.byIntent).length).toBeGreaterThan(0);

    // Each intent should have avgImpressions, avgEngagement, avgEngagementRate, count
    const firstIntent = Object.values(result.byIntent)[0] as PerformanceByCategory;
    expect(firstIntent.avgImpressions).toBeGreaterThan(0);
    expect(firstIntent.count).toBeGreaterThan(0);
  });

  it("calculates performance by topic", async () => {
    const posts = createMockPosts(25);
    mockSupabaseQuery(posts);

    const result = await getAggregatedData("user-1");

    expect(result.byTopic).toBeDefined();
    expect(Object.keys(result.byTopic).length).toBeGreaterThan(0);
  });

  it("calculates performance by content type", async () => {
    const posts = createMockPosts(25);
    mockSupabaseQuery(posts);

    const result = await getAggregatedData("user-1");

    expect(result.byContentType).toBeDefined();
    expect(Object.keys(result.byContentType).length).toBeGreaterThan(0);
  });

  it("identifies outliers (top 3 and bottom 3)", async () => {
    const posts = createMockPosts(25);
    mockSupabaseQuery(posts);

    const result = await getAggregatedData("user-1");

    expect(result.outliers.top.length).toBeLessThanOrEqual(3);
    expect(result.outliers.bottom.length).toBeLessThanOrEqual(3);
    expect(result.outliers.top.length).toBeGreaterThan(0);
  });

  it("calculates recent trend (last 30d vs previous 30d)", async () => {
    const posts = createMockPosts(25);
    mockSupabaseQuery(posts);

    const result = await getAggregatedData("user-1");

    expect(result.recentTrend).toBeDefined();
    expect(result.recentTrend.currentPeriod).toBeDefined();
    expect(result.recentTrend.previousPeriod).toBeDefined();
  });

  it("calculates posting pattern (frequency)", async () => {
    const posts = createMockPosts(25);
    mockSupabaseQuery(posts);

    const result = await getAggregatedData("user-1");

    expect(result.postingPattern).toBeDefined();
    expect(result.postingPattern.totalDays).toBeGreaterThan(0);
    expect(result.postingPattern.postsPerWeek).toBeGreaterThan(0);
  });

  it("handles posts with no metric events", async () => {
    const posts = createMockPosts(25).map((p) => ({
      ...p,
      post_publications: [
        { ...p.post_publications[0], metric_events: [] },
      ],
    }));
    mockSupabaseQuery(posts);

    const result = await getAggregatedData("user-1");

    expect(result.creatorSummary.totalPosts).toBe(25);
    // Posts with no metrics should still be counted
    expect(result.creatorSummary.postsWithMetrics).toBe(0);
  });

  it("throws on supabase error", async () => {
    mockSupabaseQuery(null, { message: "DB error" });

    await expect(getAggregatedData("user-1")).rejects.toThrow("DB error");
  });

  it("handles empty posts array", async () => {
    mockSupabaseQuery([]);

    const result = await getAggregatedData("user-1");

    expect(result.creatorSummary.totalPosts).toBe(0);
    expect(Object.keys(result.byIntent)).toHaveLength(0);
  });

  it("filters by platform when provided", async () => {
    const posts = createMockPosts(5);
    const chain = mockSupabaseQuery(posts);

    await getAggregatedData("user-1", "twitter");

    expect(chain.eq).toHaveBeenCalledWith("post_publications.platform", "twitter");
  });

  it("uses inner join when platform is provided", async () => {
    const posts = createMockPosts(5);
    const chain = mockSupabaseQuery(posts);

    await getAggregatedData("user-1", "twitter");

    expect(chain.select).toHaveBeenCalledWith("*, post_publications!inner(*, metric_events(*))");
  });

  it("uses regular join when no platform", async () => {
    const posts = createMockPosts(5);
    const chain = mockSupabaseQuery(posts);

    await getAggregatedData("user-1");

    expect(chain.select).toHaveBeenCalledWith("*, post_publications(*, metric_events(*))");
  });

  it("handles posts without classification (null intent/topics)", async () => {
    const posts = createMockPosts(25).map((p) => ({
      ...p,
      intent: null,
      content_type: null,
      topics: null,
    }));
    mockSupabaseQuery(posts);

    const result = await getAggregatedData("user-1");

    expect(result.creatorSummary.totalPosts).toBe(25);
    expect(Object.keys(result.byIntent)).toHaveLength(0);
  });
});
