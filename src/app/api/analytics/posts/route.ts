import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLatestSnapshotsBatch } from "@/lib/services/metric-snapshots";
import type { Database } from "@/types/database";

type PlatformEnum = Database["public"]["Enums"]["platform_type"];

function parsePeriodDays(period: string): number {
  const match = period.match(/^(\d+)d$/);
  return match ? Number(match[1]) : 30;
}

function computeEngagementRate(
  impressions: number | null,
  reactions: number | null,
  comments: number | null,
  shares: number | null,
): number {
  const imp = impressions ?? 0;
  if (imp === 0) return 0;
  const engagements = (reactions ?? 0) + (comments ?? 0) + (shares ?? 0);
  return Math.round((engagements / imp) * 10000) / 100;
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
  const platform = url.searchParams.get("platform") || undefined;
  const period = url.searchParams.get("period") || "30d";
  const sort = url.searchParams.get("sort") || "recent";
  const page = Number(url.searchParams.get("page")) || 1;
  const perPage = Number(url.searchParams.get("per_page")) || 20;

  const days = parsePeriodDays(period);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  try {
    const admin = createAdminClient();

    let query = admin
      .from("post_publications")
      .select(
        "id, platform, platform_post_id, published_at, status, posts!inner(id, body, content_type, created_at)",
        { count: "exact" },
      )
      .eq("status", "published")
      .not("platform_post_id", "is", null)
      .gte("published_at", since);

    if (platform && platform !== "all") {
      query = query.eq("platform", platform as PlatformEnum);
    }

    query = query.order("published_at", { ascending: false });

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    const { data: publications, error, count } = await query.range(from, to);

    if (error) throw new Error(error.message);

    const pubs = publications ?? [];
    const total = count ?? 0;

    // Batch fetch latest snapshots
    const platformPostIds = pubs
      .map((p) => p.platform_post_id)
      .filter((id): id is string => Boolean(id));
    const snapshotsMap = await getLatestSnapshotsBatch(user.id, platformPostIds);

    // Build response
    const posts = pubs.map((pub) => {
      const snapshot = snapshotsMap[pub.platform_post_id!];
      const post = pub.posts as unknown as {
        id: string;
        body: string;
        content_type: string | null;
        created_at: string;
      };

      const metrics = snapshot
        ? {
            impressions: snapshot.impressions,
            unique_reach: snapshot.unique_reach,
            reactions: snapshot.reactions,
            comments: snapshot.comments,
            shares: snapshot.shares,
            quotes: snapshot.quotes,
            bookmarks: snapshot.bookmarks,
            engagement_rate: computeEngagementRate(
              snapshot.impressions,
              snapshot.reactions,
              snapshot.comments,
              snapshot.shares,
            ),
            video_plays: snapshot.video_plays,
            video_watch_time_ms: snapshot.video_watch_time_ms,
            video_unique_viewers: snapshot.video_unique_viewers,
          }
        : null;

      return {
        id: post.id,
        publication_id: pub.id,
        platform: pub.platform,
        platform_post_id: pub.platform_post_id,
        content_type: post.content_type,
        commentary: post.body?.slice(0, 200),
        published_at: pub.published_at,
        metrics,
        metrics_updated_at: snapshot?.fetched_at ?? null,
      };
    });

    // Sort by metrics if requested
    if (sort === "impressions") {
      posts.sort(
        (a, b) =>
          (b.metrics?.impressions ?? 0) - (a.metrics?.impressions ?? 0),
      );
    } else if (sort === "engagement") {
      posts.sort(
        (a, b) =>
          (b.metrics?.engagement_rate ?? 0) -
          (a.metrics?.engagement_rate ?? 0),
      );
    }

    // Compute summary
    const summary = {
      total_posts: total,
      total_impressions: posts.reduce(
        (sum, p) => sum + (p.metrics?.impressions ?? 0),
        0,
      ),
      total_reactions: posts.reduce(
        (sum, p) => sum + (p.metrics?.reactions ?? 0),
        0,
      ),
      avg_engagement_rate:
        posts.length > 0
          ? Math.round(
              (posts.reduce(
                (sum, p) => sum + (p.metrics?.engagement_rate ?? 0),
                0,
              ) /
                posts.length) *
                100,
            ) / 100
          : 0,
      period,
    };

    return NextResponse.json({
      posts,
      summary,
      pagination: {
        page,
        per_page: perPage,
        total,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch analytics";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
