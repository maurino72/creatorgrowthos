import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertMetricEvent } from "@/lib/services/metrics";
import { getConnectionByPlatform } from "@/lib/services/connections";
import { getAdapterForPlatform } from "@/lib/adapters";
import { decrypt } from "@/lib/utils/encryption";
import type { PlatformType } from "@/lib/adapters/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const admin = createAdminClient();

  // Get published publications for this post
  const { data: publications, error } = await admin
    .from("post_publications")
    .select("id, platform, platform_post_id, published_at, user_id")
    .eq("post_id", id)
    .eq("user_id", user.id)
    .eq("status", "published")
    .not("platform_post_id", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let refreshed = 0;
  let failed = 0;

  for (const pub of publications ?? []) {
    try {
      const platform = pub.platform as PlatformType;
      const connection = await getConnectionByPlatform(user.id, platform);
      if (!connection) {
        failed++;
        continue;
      }

      const accessToken = decrypt(connection.access_token_enc!);
      const adapter = getAdapterForPlatform(platform);
      const metrics = await adapter.fetchPostMetrics(
        accessToken,
        pub.platform_post_id!,
      );

      await insertMetricEvent({
        postPublicationId: pub.id,
        userId: user.id,
        platform,
        impressions: metrics.impressions,
        likes: metrics.likes,
        replies: metrics.replies,
        reposts: metrics.reposts,
        clicks: metrics.clicks,
        profileVisits: metrics.profileVisits,
        followsFromPost: metrics.followsFromPost,
        publishedAt: new Date(pub.published_at!),
      });

      refreshed++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ refreshed, failed });
}
