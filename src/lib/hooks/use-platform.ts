"use client";

import { useEffect } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useConnections } from "@/lib/queries/connections";
import type { ConnectionData } from "@/lib/queries/connections";
import {
  slugToPlatform,
  platformToSlug,
  type PlatformSlug,
} from "@/lib/platform-slug";
import type { PlatformType } from "@/lib/adapters/types";
import { appUrl } from "@/lib/urls";

export const platformKeys = {
  selected: ["platform", "selected"] as const,
};

export function usePlatform() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
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

  // Read platform from URL [platform] param
  const platformSlug =
    typeof params?.platform === "string" ? params.platform : undefined;
  const urlPlatform = platformSlug ? slugToPlatform(platformSlug) : null;

  // Fallback for account pages (no [platform] in URL)
  const firstPlatform =
    activeConnections.length > 0 ? activeConnections[0].platform : null;

  // If URL has a platform slug but it's invalid, return null (layout will 404)
  // Only fall back to cache/first connection when there's no slug (account pages)
  const platform = platformSlug
    ? urlPlatform
    : cachedPlatform ?? firstPlatform;
  const slug = platform ? platformToSlug(platform as PlatformType) : null;

  const hasConnections = activeConnections.length > 0;

  // Sync URL platform to cache so account pages remember last-visited
  useEffect(() => {
    if (urlPlatform) {
      queryClient.setQueryData(platformKeys.selected, urlPlatform);
    }
  }, [urlPlatform, queryClient]);

  function setPlatform(newPlatform: string) {
    const newSlug = platformToSlug(newPlatform as PlatformType);
    queryClient.setQueryData(platformKeys.selected, newPlatform);

    if (platformSlug) {
      // On a platform page — swap the slug in the current path
      router.push(
        pathname.replace(/^\/(x|linkedin|threads)/, `/${newSlug}`),
      );
    } else {
      // On an account page — navigate to dashboard for new platform
      router.push(appUrl.dashboard(newSlug));
    }
  }

  return {
    platform,
    slug,
    setPlatform,
    activeConnections,
    isLoading,
    hasConnections,
  };
}
