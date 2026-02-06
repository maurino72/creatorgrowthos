import { createAdminClient } from "@/lib/supabase/admin";
import type { OnboardingStep } from "@/lib/validators/onboarding";

export interface OnboardingState {
  onboarded_at: string | null;
  onboarding_step: string | null;
}

export interface QuickProfileData {
  primary_niche: string;
  primary_goal: string;
  target_audience: string;
  custom_niche?: string;
}

export async function getOnboardingState(
  userId: string,
): Promise<OnboardingState> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("onboarded_at, onboarding_step")
    .eq("id", userId)
    .single();

  if (error) throw new Error(error.message);
  return data as OnboardingState;
}

export async function updateOnboardingStep(
  userId: string,
  step: OnboardingStep,
) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_step: step })
    .eq("id", userId)
    .single();

  if (error) throw new Error(error.message);
}

export async function saveQuickProfile(
  userId: string,
  data: QuickProfileData,
) {
  const supabase = createAdminClient();

  // Store the effective niche (custom if "other")
  const effectiveNiche =
    data.primary_niche === "other" && data.custom_niche
      ? data.custom_niche
      : data.primary_niche;

  const { data: profile, error } = await supabase
    .from("creator_profiles")
    .upsert(
      {
        user_id: userId,
        primary_niche: effectiveNiche,
        primary_goal: data.primary_goal,
        target_audience: data.target_audience,
      },
      { onConflict: "user_id" },
    )
    .select()
    .single();

  if (error) throw new Error(error.message);
  return profile;
}

export async function completeOnboarding(userId: string) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("profiles")
    .update({
      onboarded_at: new Date().toISOString(),
      onboarding_step: null,
    })
    .eq("id", userId);

  if (error) throw new Error(error.message);
}

export async function getCreatorProfile(userId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("creator_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data ?? null;
}
