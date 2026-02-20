"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

// ─── Query Keys ─────────────────────────────────────────────────────────

export interface AnalyticsPostsFilters {
  period?: string;
  platform?: string;
  sort?: string;
  page?: number;
  per_page?: number;
}

export const analyticsKeys = {
  all: ["analytics"] as const,
  posts: (filters: AnalyticsPostsFilters) =>
    ["analytics", "posts", filters] as const,
  post: (publicationId: string) =>
    ["analytics", "post", publicationId] as const,
  overview: (period: string) => ["analytics", "overview", period] as const,
  followers: (period: string, platform?: string) =>
    [
      "analytics",
      "followers",
      period,
      ...(platform ? [platform] : []),
    ] as const,
};

// ─── Fetch Functions ────────────────────────────────────────────────────

async function fetchAnalyticsPosts(filters: AnalyticsPostsFilters) {
  const params = new URLSearchParams();
  if (filters.period) params.set("period", filters.period);
  if (filters.platform) params.set("platform", filters.platform);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.per_page) params.set("per_page", String(filters.per_page));

  const response = await fetch(`/api/analytics/posts?${params}`);
  if (!response.ok) {
    throw new Error("Failed to fetch analytics posts");
  }
  return response.json();
}

async function fetchPostAnalytics(publicationId: string) {
  const response = await fetch(`/api/analytics/posts/${publicationId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch post analytics");
  }
  return response.json();
}

async function fetchAnalyticsOverview(period: string) {
  const response = await fetch(
    `/api/analytics/overview?period=${encodeURIComponent(period)}`,
  );
  if (!response.ok) {
    throw new Error("Failed to fetch analytics overview");
  }
  return response.json();
}

async function fetchFollowerGrowth(period: string, platform?: string) {
  const params = new URLSearchParams({ period });
  if (platform) params.set("platform", platform);

  const response = await fetch(`/api/analytics/followers?${params}`);
  if (!response.ok) {
    throw new Error("Failed to fetch follower growth");
  }
  return response.json();
}

// ─── Hooks ──────────────────────────────────────────────────────────────

export function useAnalyticsPosts(filters: AnalyticsPostsFilters) {
  return useQuery({
    queryKey: analyticsKeys.posts(filters),
    queryFn: () => fetchAnalyticsPosts(filters),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePostAnalytics(publicationId: string) {
  return useQuery({
    queryKey: analyticsKeys.post(publicationId),
    queryFn: () => fetchPostAnalytics(publicationId),
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(publicationId),
  });
}

export function useAnalyticsOverview(period: string) {
  return useQuery({
    queryKey: analyticsKeys.overview(period),
    queryFn: () => fetchAnalyticsOverview(period),
    staleTime: 10 * 60 * 1000,
  });
}

export function useFollowerGrowth(period: string, platform?: string) {
  return useQuery({
    queryKey: analyticsKeys.followers(period, platform),
    queryFn: () => fetchFollowerGrowth(period, platform),
    staleTime: 10 * 60 * 1000,
  });
}

export function useRefreshAnalytics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (platform: string) => {
      const response = await fetch("/api/analytics/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      if (!response.ok) {
        throw new Error("Failed to refresh analytics");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
    },
  });
}
