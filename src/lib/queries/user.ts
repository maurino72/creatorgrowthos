"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export const userKeys = {
  current: ["user", "current"] as const,
};

async function fetchCurrentUser() {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export function useCurrentUser() {
  return useQuery({
    queryKey: userKeys.current,
    queryFn: fetchCurrentUser,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
