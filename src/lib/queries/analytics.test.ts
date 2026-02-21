import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  analyticsKeys,
  useAnalyticsPosts,
  usePostAnalytics,
  useAnalyticsOverview,
  useFollowerGrowth,
  useRefreshAnalytics,
} from "./analytics";

// ─── Setup ──────────────────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Query Key Tests ────────────────────────────────────────────────────

describe("analyticsKeys", () => {
  it("generates correct key for posts list", () => {
    expect(analyticsKeys.posts({ period: "30d" })).toEqual([
      "analytics",
      "posts",
      { period: "30d" },
    ]);
  });

  it("generates correct key for post detail", () => {
    expect(analyticsKeys.post("pub-1")).toEqual([
      "analytics",
      "post",
      "pub-1",
    ]);
  });

  it("generates correct key for overview without platform", () => {
    expect(analyticsKeys.overview("30d")).toEqual([
      "analytics",
      "overview",
      "30d",
    ]);
  });

  it("generates correct key for overview with platform", () => {
    expect(analyticsKeys.overview("30d", "twitter")).toEqual([
      "analytics",
      "overview",
      "30d",
      "twitter",
    ]);
  });

  it("generates correct key for followers", () => {
    expect(analyticsKeys.followers("30d")).toEqual([
      "analytics",
      "followers",
      "30d",
    ]);
  });
});

// ─── useAnalyticsPosts ──────────────────────────────────────────────────

describe("useAnalyticsPosts", () => {
  it("fetches posts with default params", async () => {
    const mockData = {
      posts: [{ id: "post-1" }],
      summary: { total_posts: 1 },
      pagination: { page: 1, per_page: 20, total: 1 },
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const { result } = renderHook(
      () => useAnalyticsPosts({ period: "30d" }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/analytics/posts?"),
    );
  });

  it("passes filters as query params", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ posts: [], summary: {}, pagination: {} }),
    });

    renderHook(
      () =>
        useAnalyticsPosts({
          period: "7d",
          platform: "linkedin",
          sort: "impressions",
          page: 2,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("period=7d");
    expect(url).toContain("platform=linkedin");
    expect(url).toContain("sort=impressions");
    expect(url).toContain("page=2");
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "Server error" }),
    });

    const { result } = renderHook(
      () => useAnalyticsPosts({ period: "30d" }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ─── usePostAnalytics ───────────────────────────────────────────────────

describe("usePostAnalytics", () => {
  it("fetches single post analytics", async () => {
    const mockData = {
      publication: { id: "pub-1" },
      snapshots: [{ id: "snap-1" }],
      latest: { impressions: 4500 },
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const { result } = renderHook(
      () => usePostAnalytics("pub-1"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/analytics/posts/pub-1"),
    );
  });

  it("is disabled when id is empty", () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    const { result } = renderHook(
      () => usePostAnalytics(""),
      { wrapper: createWrapper() },
    );

    expect(result.current.isFetching).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// ─── useAnalyticsOverview ───────────────────────────────────────────────

describe("useAnalyticsOverview", () => {
  it("fetches overview data", async () => {
    const mockData = {
      period: "30d",
      platforms: { linkedin: { posts_count: 5 } },
      combined: { total_posts: 5, total_impressions: 25000 },
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const { result } = renderHook(
      () => useAnalyticsOverview("30d"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/analytics/overview?period=30d"),
    );
  });

  it("passes platform filter", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ period: "30d", platforms: {}, combined: {} }),
    });

    renderHook(
      () => useAnalyticsOverview("30d", "twitter"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("platform=twitter");
  });
});

// ─── useFollowerGrowth ──────────────────────────────────────────────────

describe("useFollowerGrowth", () => {
  it("fetches follower growth data", async () => {
    const mockData = {
      period: "30d",
      platforms: {
        linkedin: { current_count: 4500, net_growth: 180 },
        twitter: { current_count: 8200, net_growth: 320 },
      },
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const { result } = renderHook(
      () => useFollowerGrowth("30d"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/analytics/followers?period=30d"),
    );
  });

  it("passes platform filter", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ period: "30d", platforms: {} }),
    });

    renderHook(
      () => useFollowerGrowth("30d", "linkedin"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("platform=linkedin");
  });
});

// ─── useRefreshAnalytics ────────────────────────────────────────────────

describe("useRefreshAnalytics", () => {
  it("sends POST to refresh endpoint", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          message: "Metrics refresh triggered for linkedin",
          api_calls_today: 10,
        }),
    });

    const { result } = renderHook(() => useRefreshAnalytics(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("linkedin");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith("/api/analytics/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: "linkedin" }),
    });
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () =>
        Promise.resolve({ error: "Daily API limit reached" }),
    });

    const { result } = renderHook(() => useRefreshAnalytics(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("linkedin");

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
