"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

export const insightKeys = {
  all: ["insights"] as const,
  list: (filters: { status?: string; type?: string; platform?: string; limit?: number }) =>
    ["insights", "list", filters] as const,
};

export interface InsightFilters {
  status?: string;
  type?: string;
  platform?: string;
  limit?: number;
}

async function fetchInsights(filters?: InsightFilters) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  else params.set("status", "active");
  if (filters?.type) params.set("type", filters.type);
  if (filters?.platform) params.set("platform", filters.platform);
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
    mutationFn: async (platform?: string) => {
      const response = await fetch("/api/insights/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
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
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: insightKeys.all });
      const previous = queryClient.getQueryData(insightKeys.all);
      queryClient.setQueriesData(
        { queryKey: insightKeys.all },
        (old: { id: string; status: string }[] | undefined) =>
          old
            ? old.map((i) => (i.id === id ? { ...i, status: "dismissed" } : i))
            : old,
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(insightKeys.all, context.previous);
      }
    },
    onSettled: () => {
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
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: insightKeys.all });
      const previous = queryClient.getQueryData(insightKeys.all);
      queryClient.setQueriesData(
        { queryKey: insightKeys.all },
        (old: { id: string; status: string }[] | undefined) =>
          old
            ? old.map((i) =>
                i.id === id ? { ...i, status: "acted_on" } : i,
              )
            : old,
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(insightKeys.all, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: insightKeys.all });
    },
  });
}
