"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type { ThreadInput } from "@/lib/validators/threads";

export const threadKeys = {
  all: ["threads"] as const,
  list: () => ["threads", "list"] as const,
  detail: (id: string) => ["threads", "detail", id] as const,
};

async function fetchThreads() {
  const response = await fetch("/api/threads");
  if (!response.ok) throw new Error("Failed to fetch threads");
  const data = await response.json();
  return data.threads;
}

async function fetchThread(id: string) {
  const response = await fetch(`/api/threads/${id}`);
  if (!response.ok) throw new Error("Failed to fetch thread");
  const data = await response.json();
  return data.posts;
}

export function useThreads() {
  return useQuery({
    queryKey: threadKeys.list(),
    queryFn: fetchThreads,
  });
}

export function useThread(id: string) {
  return useQuery({
    queryKey: threadKeys.detail(id),
    queryFn: () => fetchThread(id),
    enabled: !!id,
  });
}

export function useCreateThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ThreadInput) => {
      const response = await fetch("/api/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to create thread");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: threadKeys.all });
    },
  });
}

export function usePublishThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (threadId: string) => {
      const response = await fetch(`/api/threads/${threadId}/publish`, {
        method: "POST",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to publish thread");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: threadKeys.all });
    },
  });
}

export function useDeleteThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (threadId: string) => {
      const response = await fetch(`/api/threads/${threadId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to delete thread");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: threadKeys.all });
    },
  });
}
