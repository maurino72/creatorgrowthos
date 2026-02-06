"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

export const insightKeys = {
  all: ["insights"] as const,
  list: (filters: { status?: string; type?: string; limit?: number }) =>
    ["insights", "list", filters] as const,
};

export interface InsightFilters {
  status?: string;
  type?: string;
  limit?: number;
}

async function fetchInsights(filters?: InsightFilters) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  else params.set("status", "active");
  if (filters?.type) params.set("type", filters.type);
  if (filters?.limit) params.set("limit", String(filters.limit));

  const url = `/api/insights?${params}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch insights");
  }
  const data = await response.json();
  return data.insights;
}

export function useInsights(filters?: InsightFilters) {
  const hasFilters = filters && Object.values(filters).some(Boolean);
  return useQuery({
    queryKey: hasFilters ? insightKeys.list(filters) : insightKeys.all,
    queryFn: () => fetchInsights(filters),
  });
}

export function useGenerateInsights() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/insights/generate", {
        method: "POST",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to generate insights");
      }
      return (await response.json()).insights;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insightKeys.all });
    },
  });
}

export function useDismissInsight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/insights/${id}/dismiss`, {
        method: "PATCH",
      });
      if (!response.ok) {
        throw new Error("Failed to dismiss insight");
      }
      return (await response.json()).insight;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insightKeys.all });
    },
  });
}

export function useMarkInsightActed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/insights/${id}/acted`, {
        method: "PATCH",
      });
      if (!response.ok) {
        throw new Error("Failed to update insight");
      }
      return (await response.json()).insight;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insightKeys.all });
    },
  });
}
