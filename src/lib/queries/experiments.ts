"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

export const experimentKeys = {
  all: ["experiments"] as const,
  list: (filters: { status?: string; limit?: number }) =>
    ["experiments", "list", filters] as const,
};

export interface ExperimentFilters {
  status?: string;
  limit?: number;
}

async function fetchExperiments(filters?: ExperimentFilters) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.limit) params.set("limit", String(filters.limit));

  const response = await fetch(`/api/experiments?${params}`);
  if (!response.ok) {
    throw new Error("Failed to fetch experiments");
  }
  const data = await response.json();
  return data.experiments;
}

export function useExperiments(filters?: ExperimentFilters) {
  const hasFilters = filters && Object.values(filters).some(Boolean);
  return useQuery({
    queryKey: hasFilters ? experimentKeys.list(filters) : experimentKeys.all,
    queryFn: () => fetchExperiments(filters),
  });
}

export function useSuggestExperiments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/experiments", {
        method: "POST",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to suggest experiments");
      }
      return (await response.json()).experiments;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: experimentKeys.all });
    },
  });
}

export function useAcceptExperiment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/experiments/${id}/accept`, {
        method: "PATCH",
      });
      if (!response.ok) {
        throw new Error("Failed to accept experiment");
      }
      return (await response.json()).experiment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: experimentKeys.all });
    },
  });
}

export function useDismissExperiment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/experiments/${id}/dismiss`, {
        method: "PATCH",
      });
      if (!response.ok) {
        throw new Error("Failed to dismiss experiment");
      }
      return (await response.json()).experiment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: experimentKeys.all });
    },
  });
}
