import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFollowerGrowth } from "@/lib/services/follower-snapshots";
import type { Database } from "@/types/database";

type PlatformEnum = Database["public"]["Enums"]["platform_type"];

function parsePeriodDays(period: string): number {
  const match = period.match(/^(\d+)d$/);
  return match ? Number(match[1]) : 30;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const period = url.searchParams.get("period") || "30d";
  const platformFilter = url.searchParams.get("platform") || undefined;
  const days = parsePeriodDays(period);

  try {
    const admin = createAdminClient();

    // Get user's connected platforms from platform_connections
    let connectionQuery = admin
      .from("platform_connections")
      .select("platform, user_id")
      .eq("user_id", user.id)
      .eq("status", "active");

    if (platformFilter && platformFilter !== "all") {
      connectionQuery = connectionQuery.eq("platform", platformFilter as PlatformEnum);
    }

    const { data: connections, error } = await connectionQuery.order(
      "platform",
      { ascending: true },
    );

    if (error) throw new Error(error.message);

    const uniquePlatforms = [
      ...new Set((connections ?? []).map((c) => c.platform)),
    ];

    const platforms: Record<
      string,
      {
        current_count: number;
        start_count: number;
        net_growth: number;
        growth_rate: number;
        daily: { date: string; count: number; new: number | null }[];
      }
    > = {};

    for (const platform of uniquePlatforms) {
      const growth = await getFollowerGrowth(user.id, platform, days);

      platforms[platform] = {
        current_count: growth.currentCount,
        start_count: growth.startCount,
        net_growth: growth.netGrowth,
        growth_rate: Math.round(growth.growthRate * 100) / 100,
        daily: growth.daily.map((d) => ({
          date: d.snapshot_date,
          count: d.follower_count,
          new: d.new_followers,
        })),
      };
    }

    return NextResponse.json({
      period,
      platforms,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch followers";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
