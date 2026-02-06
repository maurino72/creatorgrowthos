"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useConnections } from "@/lib/queries/connections";
import type { ConnectionData } from "@/lib/queries/connections";

export function usePlatform() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { data: connections, isLoading } = useConnections();

  const activeConnections = (connections ?? []).filter(
    (c: ConnectionData) => c.status === "active",
  );

  const paramPlatform = searchParams.get("platform");

  const isValidParam =
    paramPlatform &&
    activeConnections.some((c: ConnectionData) => c.platform === paramPlatform);

  const platform = isValidParam
    ? paramPlatform
    : activeConnections.length > 0
      ? activeConnections[0].platform
      : null;

  const hasConnections = activeConnections.length > 0;

  function setPlatform(newPlatform: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("platform", newPlatform);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return {
    platform,
    setPlatform,
    activeConnections,
    isLoading,
    hasConnections,
  };
}
