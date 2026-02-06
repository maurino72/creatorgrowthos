import { inngest } from "../client";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdapterForPlatform } from "@/lib/adapters";
import { updateTokens } from "@/lib/services/connections";
import { decrypt } from "@/lib/utils/encryption";
import type { PlatformType } from "@/lib/adapters/types";

export const checkExpiringTokens = inngest.createFunction(
  { id: "check-expiring-tokens" },
  { cron: "*/30 * * * *" }, // Every 30 minutes
  async ({ step }) => {
    const connections = await step.run("find-expiring-tokens", async () => {
      const supabase = createAdminClient();
      const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from("platform_connections")
        .select("id, user_id, platform, token_expires_at")
        .lt("token_expires_at", oneHourFromNow)
        .eq("status", "active");

      if (error) throw new Error(error.message);
      return data ?? [];
    });

    if (connections.length === 0) {
      return { expiring: 0 };
    }

    const events = connections.map((conn) => ({
      name: "connection/expiring" as const,
      data: {
        userId: conn.user_id,
        platform: conn.platform,
        connectionId: conn.id,
        expiresAt: conn.token_expires_at,
      },
    }));

    await step.sendEvent("send-expiring-events", events);

    return { expiring: connections.length };
  },
);

export const refreshToken = inngest.createFunction(
  {
    id: "refresh-token",
    retries: 3,
    concurrency: {
      limit: 3,
      key: "event.data.platform",
    },
  },
  { event: "connection/expiring" },
  async ({ event, step }) => {
    const { userId, platform, connectionId } = event.data;

    const connection = await step.run("get-connection", async () => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("platform_connections")
        .select("id, refresh_token_enc, platform")
        .eq("id", connectionId)
        .single();

      if (error) throw new Error(`Connection not found: ${error.message}`);
      return data;
    });

    if (!connection.refresh_token_enc) {
      throw new Error(`No refresh token for connection ${connectionId}`);
    }

    const newTokens = await step.run("refresh-tokens", async () => {
      const refreshTokenValue = decrypt(connection.refresh_token_enc!);
      const adapter = getAdapterForPlatform(platform as PlatformType);
      return adapter.refreshTokens(refreshTokenValue);
    });

    await step.run("update-tokens", async () => {
      await updateTokens(connectionId, {
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
        expiresAt: newTokens.expiresAt,
      });
    });

    await step.sendEvent("send-refreshed", {
      name: "connection/refreshed" as const,
      data: {
        userId,
        platform,
        connectionId,
      },
    });

    return { refreshed: true };
  },
);
