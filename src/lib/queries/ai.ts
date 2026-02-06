"use client";

import { useMutation } from "@tanstack/react-query";

export function useGenerateIdeas() {
  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/ai/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to generate ideas");
      }
      return (await response.json()).ideas;
    },
  });
}

export function useImproveContent() {
  return useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch("/api/ai/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to improve content");
      }
      return (await response.json()).result;
    },
  });
}
