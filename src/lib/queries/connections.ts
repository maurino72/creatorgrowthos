"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type { PlatformType } from "@/lib/adapters/types";

export interface ConnectionData {
  id: string;
  platform: PlatformType;
  platform_user_id: string | null;
  platform_username: string | null;
  status: "active" | "expired" | "revoked" | null;
  connected_at: string | null;
  last_synced_at: string | null;
  token_expires_at: string | null;
  scopes: string[] | null;
}

export const connectionKeys = {
  all: ["connections"] as const,
  byPlatform: (platform: PlatformType) =>
    ["connections", platform] as const,
};

async function fetchConnections(): Promise<ConnectionData[]> {
  const response = await fetch("/api/connections");
  if (!response.ok) {
    throw new Error("Failed to fetch connections");
  }
  const data = await response.json();
  return data.connections;
}

export function useConnections() {
  return useQuery({
    queryKey: connectionKeys.all,
    queryFn: fetchConnections,
  });
}

export function useConnection(platform: PlatformType) {
  const { data: connections, ...rest } = useConnections();
  return {
    data: connections?.find((c) => c.platform === platform) ?? null,
    ...rest,
  };
}

export function useDisconnect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (platform: PlatformType) => {
      const response = await fetch(`/api/connections/${platform}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to disconnect");
      }
      return response.json();
    },
    onMutate: async (platform) => {
      await queryClient.cancelQueries({ queryKey: connectionKeys.all });
      const previous = queryClient.getQueryData(connectionKeys.all);
      queryClient.setQueriesData(
        { queryKey: connectionKeys.all },
        (old: ConnectionData[] | undefined) =>
          old ? old.filter((c) => c.platform !== platform) : old,
      );
      return { previous };
    },
    onError: (_err, _platform, context) => {
      if (context?.previous) {
        queryClient.setQueryData(connectionKeys.all, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: connectionKeys.all });
    },
  });
}
