import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";
import type { PlatformType } from "@/lib/adapters/types";

export interface InsertMetricEventData {
  postPublicationId: string;
  userId: string;
  platform: PlatformType;
  impressions?: number;
  likes?: number;
  replies?: number;
  reposts?: number;
  clicks?: number;
  profileVisits?: number;
  followsFromPost?: number;
  publishedAt: Date;
}

export interface DashboardMetrics {
  totalImpressions: number;
  totalLikes: number;
  totalReplies: number;
  totalReposts: number;
  totalEngagement: number;
  averageEngagementRate: number;
  postCount: number;
}

export interface GetMetricsOptions {
  limit?: number;
  since?: string;
}

export async function insertMetricEvent(data: InsertMetricEventData) {
  const supabase = createAdminClient();

  const impressions = data.impressions ?? 0;
  const likes = data.likes ?? 0;
  const replies = data.replies ?? 0;
  const reposts = data.reposts ?? 0;

  const engagementRate =
    impressions > 0 ? (likes + replies + reposts) / impressions : null;

  const hoursSincePublish = Math.floor(
    (Date.now() - data.publishedAt.getTime()) / (1000 * 60 * 60),
  );

  const { data: event, error } = await supabase
    .from("metric_events")
    .insert({
      post_publication_id: data.postPublicationId,
      user_id: data.userId,
      platform: data.platform,
      impressions: data.impressions,
      likes: data.likes,
      replies: data.replies,
      reposts: data.reposts,
      clicks: data.clicks,
      profile_visits: data.profileVisits,
      follows_from_post: data.followsFromPost,
      engagement_rate: engagementRate,
      hours_since_publish: hoursSincePublish,
      observed_at: new Date().toISOString(),
      source: "api",
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return event;
}

export async function getMetricsForPost(
  userId: string,
  postId: string,
  options: GetMetricsOptions = {},
) {
  const supabase = createAdminClient();
  const { limit = 50, since } = options;

  let query = supabase
    .from("metric_events")
    .select("*, post_publications!inner(post_id)")
    .eq("user_id", userId)
    .eq("post_publications.post_id", postId);

  if (since) {
    query = query.gte("observed_at", since);
  }

  const { data, error } = await query
    .order("observed_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getLatestMetricsForPost(
  userId: string,
  postId: string,
) {
  const supabase = createAdminClient();

  // Get the most recent metric event per publication for this post
  const { data, error } = await supabase
    .from("metric_events")
    .select("*, post_publications!inner(post_id, platform)")
    .eq("user_id", userId)
    .eq("post_publications.post_id", postId)
    .order("observed_at", { ascending: false });

  if (error) throw new Error(error.message);

  // Deduplicate: keep only the latest per post_publication_id
  const seen = new Set<string>();
  const latest = (data ?? []).filter((event) => {
    if (seen.has(event.post_publication_id)) return false;
    seen.add(event.post_publication_id);
    return true;
  });

  return latest;
}

export async function getDashboardMetrics(
  userId: string,
  days: number,
  platform?: string,
): Promise<DashboardMetrics> {
  const supabase = createAdminClient();

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Get the latest metric event per publication within the period
  let query = supabase
    .from("metric_events")
    .select("*, post_publications!inner(post_id, published_at)")
    .eq("user_id", userId)
    .gte("post_publications.published_at", since);

  if (platform) {
    query = query.eq("post_publications.platform", platform as Database["public"]["Enums"]["platform_type"]);
  }

  const { data, error } = await query.order("observed_at", { ascending: false });

  if (error) throw new Error(error.message);

  const events = data ?? [];

  // Deduplicate: keep only the latest per post_publication_id
  const seen = new Set<string>();
  const latest = events.filter((event) => {
    if (seen.has(event.post_publication_id)) return false;
    seen.add(event.post_publication_id);
    return true;
  });

  if (latest.length === 0) {
    return {
      totalImpressions: 0,
      totalLikes: 0,
      totalReplies: 0,
      totalReposts: 0,
      totalEngagement: 0,
      averageEngagementRate: 0,
      postCount: 0,
    };
  }

  const totalImpressions = latest.reduce((sum, e) => sum + (e.impressions ?? 0), 0);
  const totalLikes = latest.reduce((sum, e) => sum + (e.likes ?? 0), 0);
  const totalReplies = latest.reduce((sum, e) => sum + (e.replies ?? 0), 0);
  const totalReposts = latest.reduce((sum, e) => sum + (e.reposts ?? 0), 0);
  const totalEngagement = totalLikes + totalReplies + totalReposts;

  const engagementRates = latest
    .map((e) => e.engagement_rate)
    .filter((r): r is number => r != null);
  const averageEngagementRate =
    engagementRates.length > 0
      ? engagementRates.reduce((sum, r) => sum + r, 0) / engagementRates.length
      : 0;

  return {
    totalImpressions,
    totalLikes,
    totalReplies,
    totalReposts,
    totalEngagement,
    averageEngagementRate,
    postCount: latest.length,
  };
}

export async function getTopPosts(
  userId: string,
  days: number,
  count: number,
  platform?: string,
) {
  const supabase = createAdminClient();

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from("metric_events")
    .select("*, post_publications!inner(post_id, platform, published_at, posts(body, status))")
    .eq("user_id", userId)
    .gte("post_publications.published_at", since);

  if (platform) {
    query = query.eq("post_publications.platform", platform as Database["public"]["Enums"]["platform_type"]);
  }

  const { data, error } = await query
    .order("observed_at", { ascending: false })
    .limit(count);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getPostsNeedingMetricUpdates() {
  const supabase = createAdminClient();

  const sixtyDaysAgo = new Date(
    Date.now() - 60 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await supabase
    .from("post_publications")
    .select("*, posts!inner(user_id, published_at, status)")
    .eq("status", "published")
    .eq("posts.status", "published")
    .gte("posts.published_at", sixtyDaysAgo)
    .not("platform_post_id", "is", null);

  if (error) throw new Error(error.message);
  return data ?? [];
}
