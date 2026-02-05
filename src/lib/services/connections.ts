import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt } from "@/lib/utils/encryption";
import type { PlatformType } from "@/lib/adapters/types";

export interface UpsertConnectionData {
  platform: PlatformType;
  platformUserId: string;
  platformUsername: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scopes: string[];
}

export interface UpdateTokensData {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export async function getConnectionsForUser(userId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("platform_connections")
    .select(
      "id, platform, platform_user_id, platform_username, status, connected_at, last_synced_at, token_expires_at, scopes",
    )
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getConnectionByPlatform(
  userId: string,
  platform: PlatformType,
) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("platform_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("platform", platform)
    .single();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data ?? null;
}

export async function upsertConnection(
  userId: string,
  data: UpsertConnectionData,
) {
  const supabase = createAdminClient();

  const { error } = await supabase.from("platform_connections").upsert(
    {
      user_id: userId,
      platform: data.platform,
      platform_user_id: data.platformUserId,
      platform_username: data.platformUsername,
      access_token_enc: encrypt(data.accessToken),
      refresh_token_enc: data.refreshToken
        ? encrypt(data.refreshToken)
        : null,
      token_expires_at: data.expiresAt?.toISOString() ?? null,
      scopes: data.scopes,
      status: "active",
      connected_at: new Date().toISOString(),
    },
    { onConflict: "user_id,platform" },
  );

  if (error) throw new Error(error.message);
}

export async function disconnectPlatform(
  userId: string,
  platform: PlatformType,
) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("platform_connections")
    .delete()
    .eq("user_id", userId)
    .eq("platform", platform);

  if (error) throw new Error(error.message);
}

export async function updateTokens(
  connectionId: string,
  tokens: UpdateTokensData,
) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("platform_connections")
    .update({
      access_token_enc: encrypt(tokens.accessToken),
      refresh_token_enc: tokens.refreshToken
        ? encrypt(tokens.refreshToken)
        : undefined,
      token_expires_at: tokens.expiresAt?.toISOString() ?? null,
      status: "active",
    })
    .eq("id", connectionId);

  if (error) throw new Error(error.message);
}
