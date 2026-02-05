"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type { CreatePostInput, UpdatePostInput } from "@/lib/validators/posts";
import type { ClassificationOverride } from "@/lib/ai/taxonomy";

export const postKeys = {
  all: ["posts"] as const,
  list: (filters: { status?: string }) =>
    ["posts", "list", filters] as const,
  detail: (id: string) => ["posts", "detail", id] as const,
};

export interface PostFilters {
  status?: string;
  intent?: string;
  content_type?: string;
  topic?: string;
}

async function fetchPosts(filters?: PostFilters) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.intent) params.set("intent", filters.intent);
  if (filters?.content_type) params.set("content_type", filters.content_type);
  if (filters?.topic) params.set("topic", filters.topic);

  const url = `/api/posts${params.toString() ? `?${params}` : ""}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch posts");
  }
  const data = await response.json();
  return data.posts;
}

async function fetchPost(id: string) {
  const response = await fetch(`/api/posts/${id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch post");
  }
  const data = await response.json();
  return data.post;
}

export function usePosts(filters?: PostFilters) {
  const hasFilters = filters && Object.values(filters).some(Boolean);
  return useQuery({
    queryKey: hasFilters ? postKeys.list(filters) : postKeys.all,
    queryFn: () => fetchPosts(filters),
  });
}

export function usePost(id: string) {
  return useQuery({
    queryKey: postKeys.detail(id),
    queryFn: () => fetchPost(id),
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePostInput) => {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Failed to create post");
      }
      return (await response.json()).post;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postKeys.all });
    },
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePostInput }) => {
      const response = await fetch(`/api/posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Failed to update post");
      }
      return (await response.json()).post;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postKeys.all });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/posts/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete post");
      }
      return (await response.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postKeys.all });
    },
  });
}

export function usePublishPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/posts/${id}/publish`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to publish post");
      }
      return (await response.json()).results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postKeys.all });
    },
  });
}

export function useClassifyPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/posts/${id}/classify`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to classify post");
      }
      return (await response.json()).classifications;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postKeys.all });
    },
  });
}

export function useUpdateClassifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ClassificationOverride }) => {
      const response = await fetch(`/api/posts/${id}/classifications`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Failed to update classifications");
      }
      return (await response.json()).post;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postKeys.all });
    },
  });
}
