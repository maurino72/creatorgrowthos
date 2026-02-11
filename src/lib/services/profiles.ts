import { createAdminClient } from "@/lib/supabase/admin";
import type { OnboardingStep } from "@/lib/validators/onboarding";

export interface OnboardingState {
  onboarded_at: string | null;
  onboarding_step: string | null;
}

export interface QuickProfileData {
  niches: string[];
  goals: string[];
  target_audience: string;
  custom_niche?: string;
}

export interface UpdateCreatorProfileData {
  niches?: string[];
  goals?: string[];
  target_audience?: string;
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

  // Resolve "other" niche with custom_niche value
  const effectiveNiches = data.niches.map((niche) =>
    niche === "other" && data.custom_niche ? data.custom_niche : niche,
  );

  const { data: profile, error } = await supabase
    .from("creator_profiles")
    .upsert(
      {
        user_id: userId,
        niches: effectiveNiches,
        goals: data.goals,
        target_audience: data.target_audience,
      },
      { onConflict: "user_id" },
    )
    .select()
    .single();

  if (error) throw new Error(error.message);
  return profile;
}

export async function updateCreatorProfile(
  userId: string,
  data: UpdateCreatorProfileData,
) {
  const supabase = createAdminClient();

  const { data: profile, error } = await supabase
    .from("creator_profiles")
    .update(data)
    .eq("user_id", userId)
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
