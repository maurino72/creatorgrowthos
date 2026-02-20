import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  usePostMetrics,
  useLatestMetrics,
  useLatestMetricsBatch,
  useDashboardMetrics,
  useTopPosts,
  useRefreshMetrics,
  metricKeys,
} from "./metrics";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
  };
}

describe("metricKeys", () => {
  it("defines all key", () => {
    expect(metricKeys.all).toEqual(["metrics"]);
  });

  it("defines post key", () => {
    expect(metricKeys.post("post-1")).toEqual(["metrics", "post", "post-1"]);
  });

  it("defines latest key", () => {
    expect(metricKeys.latest("post-1")).toEqual(["metrics", "latest", "post-1"]);
  });

  it("defines dashboard key", () => {
    expect(metricKeys.dashboard(7)).toEqual(["metrics", "dashboard", 7]);
  });

  it("defines topPosts key", () => {
    expect(metricKeys.topPosts(7, 5)).toEqual(["metrics", "topPosts", 7, 5]);
  });
});

describe("usePostMetrics", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches metrics from API", async () => {
    const mockMetrics = [
      { id: "event-1", impressions: 1500, observed_at: "2024-01-02T00:00:00Z" },
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ metrics: mockMetrics }), { status: 200 }),
    );

    const { result } = renderHook(() => usePostMetrics("post-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockMetrics);
  });

  it("calls correct API endpoint", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ metrics: [] }), { status: 200 }),
      );

    const { result } = renderHook(() => usePostMetrics("post-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSpy).toHaveBeenCalledWith("/api/posts/post-1/metrics");
  });
});

describe("useLatestMetrics", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches latest metrics from API", async () => {
    const mockMetrics = [
      { id: "event-1", impressions: 2000, likes: 50 },
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ metrics: mockMetrics }), { status: 200 }),
    );

    const { result } = renderHook(() => useLatestMetrics("post-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockMetrics);
  });

  it("calls correct API endpoint", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ metrics: [] }), { status: 200 }),
      );

    const { result } = renderHook(() => useLatestMetrics("post-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSpy).toHaveBeenCalledWith("/api/posts/post-1/metrics/latest");
  });

  it("uses 5-minute staleTime to reduce redundant fetches", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ metrics: [] }), { status: 200 }),
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useLatestMetrics("post-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const queryState = queryClient.getQueryCache().find({ queryKey: metricKeys.latest("post-1") });
    expect((queryState?.options as Record<string, unknown>)?.staleTime).toBe(5 * 60 * 1000);
  });
});

describe("useLatestMetricsBatch", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches batch metrics from API with sorted post IDs", async () => {
    const mockMetrics = {
      "post-1": [{ id: "e1", impressions: 100 }],
      "post-2": [{ id: "e2", impressions: 200 }],
    };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ metrics: mockMetrics }), { status: 200 }),
    );

    const { result } = renderHook(
      () => useLatestMetricsBatch(["post-2", "post-1"]),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockMetrics);
    // IDs should be sorted in the URL for consistent cache keys
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/posts/metrics/latest-batch?post_ids=post-1%2Cpost-2",
    );
  });

  it("is disabled when postIds is empty", () => {
    vi.spyOn(globalThis, "fetch");

    const { result } = renderHook(() => useLatestMetricsBatch([]), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("uses latestBatch key with sorted IDs", () => {
    expect(metricKeys.latestBatch(["b", "a"])).toEqual([
      "metrics",
      "latestBatch",
      "a",
      "b",
    ]);
  });
});

describe("useDashboardMetrics", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches dashboard metrics for the given period", async () => {
    const mockData = {
      totalImpressions: 5000,
      totalEngagement: 200,
      averageEngagementRate: 0.04,
      postCount: 10,
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockData), { status: 200 }),
    );

    const { result } = renderHook(() => useDashboardMetrics(7), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
  });

  it("calls correct API endpoint with period", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({}), { status: 200 }),
      );

    const { result } = renderHook(() => useDashboardMetrics(30), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/dashboard/metrics?days=30",
    );
  });

  it("includes platform in URL when provided", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({}), { status: 200 }),
      );

    const { result } = renderHook(() => useDashboardMetrics(7, "twitter"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/dashboard/metrics?days=7&platform=twitter",
    );
  });

  it("includes platform in query key", () => {
    expect(metricKeys.dashboard(7, "twitter")).toEqual([
      "metrics",
      "dashboard",
      7,
      "twitter",
    ]);
  });
});

describe("useTopPosts", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches top posts from API", async () => {
    const mockPosts = [
      { id: "post-1", impressions: 5000 },
      { id: "post-2", impressions: 3000 },
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ posts: mockPosts }), { status: 200 }),
    );

    const { result } = renderHook(() => useTopPosts(7, 5), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockPosts);
  });

  it("calls correct API endpoint with params", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ posts: [] }), { status: 200 }),
      );

    const { result } = renderHook(() => useTopPosts(30, 3), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/dashboard/metrics/top?days=30&limit=3",
    );
  });

  it("includes platform in URL when provided", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ posts: [] }), { status: 200 }),
      );

    const { result } = renderHook(() => useTopPosts(7, 5, "twitter"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/dashboard/metrics/top?days=7&limit=5&platform=twitter",
    );
  });

  it("includes platform in query key", () => {
    expect(metricKeys.topPosts(7, 5, "twitter")).toEqual([
      "metrics",
      "topPosts",
      7,
      5,
      "twitter",
    ]);
  });
});

describe("useRefreshMetrics", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends POST to refresh endpoint", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ refreshed: 1, failed: 0 }), {
          status: 200,
        }),
      );

    const { result } = renderHook(() => useRefreshMetrics(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("post-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSpy).toHaveBeenCalledWith("/api/posts/post-1/metrics/refresh", {
      method: "POST",
    });
  });
});
