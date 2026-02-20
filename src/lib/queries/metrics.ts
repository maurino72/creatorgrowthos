"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

export const metricKeys = {
  all: ["metrics"] as const,
  post: (postId: string) => ["metrics", "post", postId] as const,
  latest: (postId: string) => ["metrics", "latest", postId] as const,
  latestBatch: (postIds: string[]) =>
    ["metrics", "latestBatch", ...postIds.slice().sort()] as const,
  dashboard: (days: number, platform?: string) =>
    ["metrics", "dashboard", days, ...(platform ? [platform] : [])] as const,
  topPosts: (days: number, limit: number, platform?: string) =>
    ["metrics", "topPosts", days, limit, ...(platform ? [platform] : [])] as const,
  timeSeries: (days: number, platform?: string) =>
    ["metrics", "timeSeries", days, ...(platform ? [platform] : [])] as const,
};

async function fetchPostMetrics(postId: string) {
  const response = await fetch(`/api/posts/${postId}/metrics`);
  if (!response.ok) {
    throw new Error("Failed to fetch post metrics");
  }
  const data = await response.json();
  return data.metrics;
}

async function fetchLatestMetrics(postId: string) {
  const response = await fetch(`/api/posts/${postId}/metrics/latest`);
  if (!response.ok) {
    throw new Error("Failed to fetch latest metrics");
  }
  const data = await response.json();
  return data.metrics;
}

async function fetchLatestMetricsBatch(postIds: string[]) {
  const sorted = postIds.slice().sort();
  const params = new URLSearchParams({ post_ids: sorted.join(",") });
  const response = await fetch(`/api/posts/metrics/latest-batch?${params}`);
  if (!response.ok) {
    throw new Error("Failed to fetch batch metrics");
  }
  const data = await response.json();
  return data.metrics as Record<string, Array<{ id: string; impressions?: number; likes?: number; replies?: number; reposts?: number; engagement_rate?: number | null; observed_at?: string }>>;
}

export function useLatestMetricsBatch(postIds: string[]) {
  return useQuery({
    queryKey: metricKeys.latestBatch(postIds),
    queryFn: () => fetchLatestMetricsBatch(postIds),
    staleTime: 5 * 60 * 1000,
    enabled: postIds.length > 0,
  });
}

async function fetchDashboardMetrics(days: number, platform?: string) {
  const params = new URLSearchParams({ days: String(days) });
  if (platform) params.set("platform", platform);
  const response = await fetch(`/api/dashboard/metrics?${params}`);
  if (!response.ok) {
    throw new Error("Failed to fetch dashboard metrics");
  }
  return response.json();
}

async function fetchTopPosts(days: number, limit: number, platform?: string) {
  const params = new URLSearchParams({
    days: String(days),
    limit: String(limit),
  });
  if (platform) params.set("platform", platform);
  const response = await fetch(`/api/dashboard/metrics/top?${params}`);
  if (!response.ok) {
    throw new Error("Failed to fetch top posts");
  }
  const data = await response.json();
  return data.posts;
}

export function usePostMetrics(postId: string) {
  return useQuery({
    queryKey: metricKeys.post(postId),
    queryFn: () => fetchPostMetrics(postId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useLatestMetrics(postId: string) {
  return useQuery({
    queryKey: metricKeys.latest(postId),
    queryFn: () => fetchLatestMetrics(postId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDashboardMetrics(days: number, platform?: string) {
  return useQuery({
    queryKey: metricKeys.dashboard(days, platform),
    queryFn: () => fetchDashboardMetrics(days, platform),
    staleTime: 10 * 60 * 1000,
  });
}

export function useTopPosts(days: number, limit: number, platform?: string) {
  return useQuery({
    queryKey: metricKeys.topPosts(days, limit, platform),
    queryFn: () => fetchTopPosts(days, limit, platform),
    staleTime: 10 * 60 * 1000,
  });
}

async function fetchMetricsTimeSeries(days: number, platform?: string) {
  const params = new URLSearchParams({ days: String(days) });
  if (platform) params.set("platform", platform);
  const response = await fetch(`/api/dashboard/metrics/timeseries?${params}`);
  if (!response.ok) {
    throw new Error("Failed to fetch metrics time series");
  }
  const data = await response.json();
  return data.series;
}

export function useMetricsTimeSeries(days: number, platform?: string) {
  return useQuery({
    queryKey: metricKeys.timeSeries(days, platform),
    queryFn: () => fetchMetricsTimeSeries(days, platform),
    staleTime: 10 * 60 * 1000,
  });
}

export function useRefreshMetrics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const response = await fetch(`/api/posts/${postId}/metrics/refresh`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to refresh metrics");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: metricKeys.all });
    },
  });
}
