"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  UpdateProfileInput,
  PreferenceSection,
  ExportDataInput,
  DeleteAccountInput,
} from "@/lib/validators/settings";
import type { UpdateCreatorProfileInput } from "@/lib/validators/onboarding";

export const settingsKeys = {
  all: ["settings"] as const,
};

export const creatorProfileKeys = {
  all: ["creator-profile"] as const,
};

async function fetchSettings() {
  const response = await fetch("/api/settings");
  if (!response.ok) throw new Error("Failed to fetch settings");
  return response.json();
}

export function useSettings() {
  return useQuery({
    queryKey: settingsKeys.all,
    queryFn: fetchSettings,
    staleTime: 10 * 60 * 1000,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateProfileInput) => {
      const response = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update profile");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      section: PreferenceSection;
      settings: Record<string, unknown>;
    }) => {
      const response = await fetch("/api/settings/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update preferences");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}

export function useExportData() {
  return useMutation({
    mutationFn: async (data: ExportDataInput) => {
      const response = await fetch("/api/settings/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to export data");
      return response.json();
    },
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: async (data: DeleteAccountInput) => {
      const response = await fetch("/api/settings/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to delete account");
      return response.json();
    },
  });
}

async function fetchCreatorProfile() {
  const response = await fetch("/api/settings/creator-profile");
  if (!response.ok) throw new Error("Failed to fetch creator profile");
  return response.json();
}

export function useCreatorProfile() {
  return useQuery({
    queryKey: creatorProfileKeys.all,
    queryFn: fetchCreatorProfile,
    staleTime: 10 * 60 * 1000,
  });
}

export function useUpdateCreatorProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateCreatorProfileInput) => {
      const response = await fetch("/api/settings/creator-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update creator profile");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: creatorProfileKeys.all });
    },
  });
}
