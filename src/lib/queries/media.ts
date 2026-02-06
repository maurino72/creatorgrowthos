"use client";

import { useQuery, useMutation } from "@tanstack/react-query";

export interface UploadedImage {
  url: string;
  path: string;
}

export function useUploadMedia() {
  return useMutation({
    mutationFn: async (file: File): Promise<UploadedImage> => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Upload failed");
      }

      return response.json();
    },
  });
}

export function useSignedUrls(paths: string[]) {
  return useQuery({
    queryKey: ["media", "signed-urls", paths],
    queryFn: async () => {
      if (paths.length === 0) return [];
      const response = await fetch("/api/media/signed-urls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths }),
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.urls as { path: string; url: string }[];
    },
    enabled: paths.length > 0,
  });
}

export function useDeleteMedia() {
  return useMutation({
    mutationFn: async (fileId: string): Promise<void> => {
      const response = await fetch(`/api/media/${fileId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Delete failed");
      }
    },
  });
}
