"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useConnections } from "@/lib/queries/connections";
import type { ConnectionData } from "@/lib/queries/connections";

export function usePlatform() {
  const searchParams = useSearchParams();
  const { data: connections, isLoading } = useConnections();
  const [localPlatform, setLocalPlatform] = useState<string | null>(null);

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

  // Local override takes precedence over URL param / derived
  const platform = localPlatform ?? derivedPlatform;

  const hasConnections = activeConnections.length > 0;

  function setPlatform(newPlatform: string) {
    setLocalPlatform(newPlatform);
  }

  return {
    platform,
    setPlatform,
    activeConnections,
    isLoading,
    hasConnections,
  };
}
