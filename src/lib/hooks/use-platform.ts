"use client";

import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useConnections } from "@/lib/queries/connections";
import type { ConnectionData } from "@/lib/queries/connections";

export const platformKeys = {
  selected: ["platform", "selected"] as const,
};

export function usePlatform() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { data: connections, isLoading } = useConnections();

  const { data: cachedPlatform } = useQuery<string | null>({
    queryKey: platformKeys.selected,
    queryFn: () => null,
    initialData: null,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const activeConnections = (connections ?? []).filter(
    (c: ConnectionData) => c.status === "active",
  );

  const paramPlatform = searchParams.get("platform");

  const isValidParam =
    paramPlatform &&
    activeConnections.some((c: ConnectionData) => c.platform === paramPlatform);

  const derivedPlatform = isValidParam
    ? paramPlatform
    : activeConnections.length > 0
      ? activeConnections[0].platform
      : null;

  // Cache override takes precedence over URL param / derived
  const platform = cachedPlatform ?? derivedPlatform;

  const hasConnections = activeConnections.length > 0;

  function setPlatform(newPlatform: string) {
    queryClient.setQueryData(platformKeys.selected, newPlatform);
  }

  return {
    platform,
    setPlatform,
    activeConnections,
    isLoading,
    hasConnections,
  };
}
