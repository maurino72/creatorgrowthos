import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getInsightsForUser } from "@/lib/services/insights";
import type { Database } from "@/types/database";

type PlatformType = Database["public"]["Enums"]["platform_type"];

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status") || undefined;
  const type = url.searchParams.get("type") || undefined;
  const platform = (url.searchParams.get("platform") || undefined) as PlatformType | undefined;
  const limit = Number(url.searchParams.get("limit")) || 10;

  try {
    const insights = await getInsightsForUser(user.id, { status, type, platform, limit });
    return NextResponse.json({ insights });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch insights";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
