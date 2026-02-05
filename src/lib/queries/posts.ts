"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type { CreatePostInput, UpdatePostInput } from "@/lib/validators/posts";

export const postKeys = {
  all: ["posts"] as const,
  list: (filters: { status?: string }) =>
    ["posts", "list", filters] as const,
  detail: (id: string) => ["posts", "detail", id] as const,
};

async function fetchPosts(filters?: { status?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);

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

export function usePosts(filters?: { status?: string }) {
  return useQuery({
    queryKey: filters?.status ? postKeys.list(filters) : postKeys.all,
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
