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
  dashboard: (days: number) => ["metrics", "dashboard", days] as const,
  topPosts: (days: number, limit: number) =>
    ["metrics", "topPosts", days, limit] as const,
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

async function fetchDashboardMetrics(days: number) {
  const response = await fetch(`/api/dashboard/metrics?days=${days}`);
  if (!response.ok) {
    throw new Error("Failed to fetch dashboard metrics");
  }
  return response.json();
}

async function fetchTopPosts(days: number, limit: number) {
  const response = await fetch(
    `/api/dashboard/metrics/top?days=${days}&limit=${limit}`,
  );
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
    staleTime: 2 * 60 * 1000,
  });
}

export function useDashboardMetrics(days: number) {
  return useQuery({
    queryKey: metricKeys.dashboard(days),
    queryFn: () => fetchDashboardMetrics(days),
    staleTime: 10 * 60 * 1000,
  });
}

export function useTopPosts(days: number, limit: number) {
  return useQuery({
    queryKey: metricKeys.topPosts(days, limit),
    queryFn: () => fetchTopPosts(days, limit),
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
