import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLatestSnapshotsBatch } from "@/lib/services/metric-snapshots";
import { getFollowerGrowth } from "@/lib/services/follower-snapshots";
import type { Database } from "@/types/database";

type PlatformEnum = Database["public"]["Enums"]["platform_type"];

function parsePeriodDays(period: string): number {
  const match = period.match(/^(\d+)d$/);
  return match ? Number(match[1]) : 30;
}

interface PlatformStats {
  posts_count: number;
  total_impressions: number;
  total_reach: number;
  total_reactions: number;
  total_comments: number;
  total_shares: number;
  total_quotes: number;
  total_bookmarks: number;
  avg_engagement_rate: number;
  follower_count: number;
  follower_growth: number;
  follower_growth_rate: number;
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
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  try {
    const admin = createAdminClient();

    // Fetch published posts in period, optionally filtered by platform
    let pubQuery = admin
      .from("post_publications")
      .select(
        "id, platform, platform_post_id, published_at, posts!inner(id, content_type)",
      )
      .eq("status", "published")
      .not("platform_post_id", "is", null)
      .gte("published_at", since);

    if (platformFilter && platformFilter !== "all") {
      pubQuery = pubQuery.eq("platform", platformFilter as PlatformEnum);
    }

    const { data: publications, error } = await pubQuery
      .order("published_at", { ascending: false });

    if (error) throw new Error(error.message);

    const pubs = publications ?? [];

    // Batch fetch latest snapshots (non-fatal — tables may not exist yet)
    const platformPostIds = pubs
      .map((p) => p.platform_post_id)
      .filter((id): id is string => Boolean(id));
    let snapshotsMap: Record<string, Awaited<ReturnType<typeof getLatestSnapshotsBatch>>[string]> = {};
    try {
      snapshotsMap = await getLatestSnapshotsBatch(user.id, platformPostIds);
    } catch {
      // metric_snapshots table may not exist yet
    }

    // Group by platform
    const platformMap: Record<string, PlatformStats> = {};
    const platforms = [...new Set(pubs.map((p) => p.platform))];

    for (const platform of platforms) {
      const platformPubs = pubs.filter((p) => p.platform === platform);
      const stats: PlatformStats = {
        posts_count: platformPubs.length,
        total_impressions: 0,
        total_reach: 0,
        total_reactions: 0,
        total_comments: 0,
        total_shares: 0,
        total_quotes: 0,
        total_bookmarks: 0,
        avg_engagement_rate: 0,
        follower_count: 0,
        follower_growth: 0,
        follower_growth_rate: 0,
      };

      let totalEngagement = 0;

      for (const pub of platformPubs) {
        const snapshot = snapshotsMap[pub.platform_post_id!];
        if (!snapshot) continue;

        stats.total_impressions += snapshot.impressions ?? 0;
        stats.total_reach += snapshot.unique_reach ?? 0;
        stats.total_reactions += snapshot.reactions ?? 0;
        stats.total_comments += snapshot.comments ?? 0;
        stats.total_shares += snapshot.shares ?? 0;
        stats.total_quotes += snapshot.quotes ?? 0;
        stats.total_bookmarks += snapshot.bookmarks ?? 0;

        if ((snapshot.impressions ?? 0) > 0) {
          const engagements =
            (snapshot.reactions ?? 0) +
            (snapshot.comments ?? 0) +
            (snapshot.shares ?? 0);
          totalEngagement += engagements / snapshot.impressions!;
        }
      }

      stats.avg_engagement_rate =
        platformPubs.length > 0
          ? Math.round((totalEngagement / platformPubs.length) * 10000) / 100
          : 0;

      // Fetch follower growth (non-fatal — table may not exist yet)
      try {
        const growth = await getFollowerGrowth(user.id, platform, days);
        stats.follower_count = growth.currentCount;
        stats.follower_growth = growth.netGrowth;
        stats.follower_growth_rate =
          Math.round(growth.growthRate * 100) / 100;
      } catch {
        // follower_snapshots table may not exist yet
      }

      platformMap[platform] = stats;
    }

    // Combined totals
    const combined = {
      total_posts: pubs.length,
      total_impressions: Object.values(platformMap).reduce(
        (s, p) => s + p.total_impressions,
        0,
      ),
      total_engagements: Object.values(platformMap).reduce(
        (s, p) =>
          s + p.total_reactions + p.total_comments + p.total_shares,
        0,
      ),
      avg_engagement_rate:
        platforms.length > 0
          ? Math.round(
              (Object.values(platformMap).reduce(
                (s, p) => s + p.avg_engagement_rate,
                0,
              ) /
                platforms.length) *
                100,
            ) / 100
          : 0,
      total_follower_growth: Object.values(platformMap).reduce(
        (s, p) => s + p.follower_growth,
        0,
      ),
    };

    return NextResponse.json({
      period,
      platforms: platformMap,
      combined,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch overview";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
