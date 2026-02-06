import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_PREFERENCES,
  type UpdateProfileInput,
  type PreferenceSection,
  type UserPreferences,
} from "@/lib/validators/settings";

export interface SettingsProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  timezone: string | null;
}

export interface SettingsResult {
  profile: SettingsProfile;
  preferences: UserPreferences;
}

function mergePreferences(
  saved: Record<string, unknown>,
): UserPreferences {
  const result = { ...DEFAULT_PREFERENCES };

  for (const section of Object.keys(DEFAULT_PREFERENCES) as PreferenceSection[]) {
    const savedSection = saved[section];
    if (savedSection && typeof savedSection === "object") {
      (result as Record<string, unknown>)[section] = {
        ...DEFAULT_PREFERENCES[section],
        ...(savedSection as Record<string, unknown>),
      };
    }
  }

  return result as UserPreferences;
}

export async function getSettings(userId: string): Promise<SettingsResult> {
  const supabase = createAdminClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, bio, website, timezone, preferences")
    .eq("id", userId)
    .single();

  if (error) throw new Error(error.message);

  const raw = (profile.preferences ?? {}) as Record<string, unknown>;

  return {
    profile: {
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      avatar_url: profile.avatar_url,
      bio: profile.bio,
      website: profile.website,
      timezone: profile.timezone,
    },
    preferences: mergePreferences(raw),
  };
}

export async function updateProfile(
  userId: string,
  data: UpdateProfileInput,
) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("profiles")
    .update(data)
    .eq("id", userId);

  if (error) throw new Error(error.message);
}

export async function updatePreferences(
  userId: string,
  section: PreferenceSection,
  settings: Record<string, unknown>,
) {
  const supabase = createAdminClient();

  // Fetch current preferences to merge
  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("id", userId)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const current = (profile.preferences ?? {}) as Record<string, unknown>;
  const currentSection =
    (current[section] as Record<string, unknown>) ?? {};

  const updated = {
    ...current,
    [section]: { ...currentSection, ...settings },
  };

  const { error } = await supabase
    .from("profiles")
    .update({ preferences: updated })
    .eq("id", userId);

  if (error) throw new Error(error.message);
}

export async function deleteAccount(userId: string) {
  const supabase = createAdminClient();

  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
}

export async function exportUserData(
  userId: string,
  type: "all" | "posts" | "analytics",
  _format: "json" | "csv",
) {
  const supabase = createAdminClient();
  const result: Record<string, unknown> = {};

  if (type === "all" || type === "posts") {
    const { data: posts } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", userId);
    result.posts = posts ?? [];
  }

  if (type === "all" || type === "analytics") {
    const { data: metrics } = await supabase
      .from("metric_events")
      .select("*")
      .eq("user_id", userId);
    result.metrics = metrics ?? [];
  }

  if (type === "all") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    result.profile = profile;
  }

  return result;
}
