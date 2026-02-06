"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { QuickProfileInput } from "@/lib/validators/onboarding";

export const onboardingKeys = {
  state: ["onboarding", "state"] as const,
  ideas: ["onboarding", "ideas"] as const,
};

async function fetchOnboardingState() {
  const response = await fetch("/api/onboarding");
  if (!response.ok) throw new Error("Failed to fetch onboarding state");
  return response.json();
}

export function useOnboardingState() {
  return useQuery({
    queryKey: onboardingKeys.state,
    queryFn: fetchOnboardingState,
  });
}

export function useUpdateOnboardingStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (step: string) => {
      const response = await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step }),
      });
      if (!response.ok) throw new Error("Failed to update step");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.state });
    },
  });
}

export function useSaveQuickProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: QuickProfileInput) => {
      const response = await fetch("/api/onboarding/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to save profile");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.state });
    },
  });
}

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to complete onboarding");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.state });
    },
  });
}

export function useImportTwitter() {
  return useMutation({
    mutationFn: async (count: number) => {
      const response = await fetch("/api/import/twitter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count }),
      });
      if (!response.ok) throw new Error("Failed to import tweets");
      return response.json() as Promise<{
        imported_count: number;
        failed_count: number;
        message: string;
      }>;
    },
  });
}

export function useStarterIdeas() {
  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/onboarding/ideas", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to generate ideas");
      return response.json() as Promise<{
        ideas: Array<{ idea: string; hook: string }>;
        preview: Array<{ idea: string; hook: string }>;
      }>;
    },
  });
}
