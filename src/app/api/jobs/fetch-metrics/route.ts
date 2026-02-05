import { NextResponse } from "next/server";
import {
  getPostsNeedingMetricUpdates,
  insertMetricEvent,
} from "@/lib/services/metrics";
import { getConnectionByPlatform } from "@/lib/services/connections";
import { getAdapterForPlatform } from "@/lib/adapters";
import { decrypt } from "@/lib/utils/encryption";
import type { PlatformType } from "@/lib/adapters/types";

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const publications = await getPostsNeedingMetricUpdates();

  let failed = 0;

  for (const pub of publications) {
    try {
      const platform = pub.platform as PlatformType;
      const userId = pub.user_id;

      const connection = await getConnectionByPlatform(userId, platform);
      if (!connection) {
        failed++;
        continue;
      }

      const accessToken = decrypt(connection.access_token_enc);
      const adapter = getAdapterForPlatform(platform);
      const metrics = await adapter.fetchPostMetrics(
        accessToken,
        pub.platform_post_id!,
      );

      await insertMetricEvent({
        postPublicationId: pub.id,
        userId,
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
    } catch {
      failed++;
    }
  }

  return NextResponse.json({
    processed: publications.length,
    failed,
  });
}
