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

export async function getLatestMetricsBatch(
  userId: string,
  postIds: string[],
) {
  if (postIds.length === 0) return {};

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("metric_events")
    .select("*, post_publications!inner(post_id, platform)")
    .eq("user_id", userId)
    .in("post_publications.post_id", postIds)
    .order("observed_at", { ascending: false });

  if (error) throw new Error(error.message);

  // Deduplicate: keep only the latest per post_publication_id
  const seen = new Set<string>();
  const latest = (data ?? []).filter((event) => {
    if (seen.has(event.post_publication_id)) return false;
    seen.add(event.post_publication_id);
    return true;
  });

  // Group by post_id
  const result: Record<string, typeof latest> = {};
  for (const event of latest) {
    const postId = (event.post_publications as unknown as { post_id: string }).post_id;
    if (!result[postId]) result[postId] = [];
    result[postId].push(event);
  }

  return result;
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

export interface DailyMetricPoint {
  date: string;
  impressions: number;
  likes: number;
  replies: number;
  reposts: number;
  engagement: number;
}

export async function getMetricsTimeSeries(
  userId: string,
  days: number,
  platform?: string,
): Promise<DailyMetricPoint[]> {
  const supabase = createAdminClient();

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from("metric_events")
    .select("impressions, likes, replies, reposts, engagement_rate, observed_at, post_publications!inner(published_at)")
    .eq("user_id", userId)
    .gte("post_publications.published_at", since);

  if (platform) {
    query = query.eq("post_publications.platform", platform as Database["public"]["Enums"]["platform_type"]);
  }

  const { data, error } = await query.order("observed_at", { ascending: true });

  if (error) throw new Error(error.message);

  const events = data ?? [];
  if (events.length === 0) return [];

  // Group by date (YYYY-MM-DD)
  const byDate = new Map<string, DailyMetricPoint>();

  for (const event of events) {
    const date = event.observed_at.slice(0, 10);
    const existing = byDate.get(date);

    const impressions = event.impressions ?? 0;
    const likes = event.likes ?? 0;
    const replies = event.replies ?? 0;
    const reposts = event.reposts ?? 0;

    if (existing) {
      existing.impressions += impressions;
      existing.likes += likes;
      existing.replies += replies;
      existing.reposts += reposts;
      existing.engagement += likes + replies + reposts;
    } else {
      byDate.set(date, {
        date,
        impressions,
        likes,
        replies,
        reposts,
        engagement: likes + replies + reposts,
      });
    }
  }

  return Array.from(byDate.values());
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

// Age-based fetch intervals: newer posts get more frequent fetches
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export function getMetricsFetchInterval(publishedAt: Date): number | null {
  const ageMs = Date.now() - publishedAt.getTime();

  if (ageMs < 8 * HOUR) return 15 * 60 * 1000;  // < 8h: every 15 min
  if (ageMs < DAY) return 2 * HOUR;              // 8h-24h: every 2h
  if (ageMs < 3 * DAY) return 6 * HOUR;          // 1-3d: every 6h
  if (ageMs < 7 * DAY) return 12 * HOUR;         // 3-7d: every 12h
  if (ageMs < 30 * DAY) return DAY;              // 7-30d: every 24h
  return null;                                    // > 30d: stop
}

export interface PublicationDueForMetrics {
  id: string;
  platform: string;
  platformPostId: string;
  publishedAt: string;
  userId: string;
  postId: string;
}

export async function getPublicationsDueForMetrics(): Promise<PublicationDueForMetrics[]> {
  const supabase = createAdminClient();

  const thirtyDaysAgo = new Date(Date.now() - 30 * DAY).toISOString();

  // Get all published publications within 30 days
  const { data: publications, error: pubError } = await supabase
    .from("post_publications")
    .select("id, platform, platform_post_id, published_at, posts!inner(id, user_id)")
    .eq("status", "published")
    .gte("published_at", thirtyDaysAgo)
    .not("platform_post_id", "is", null);

  if (pubError) throw new Error(pubError.message);
  if (!publications || publications.length === 0) return [];

  const pubIds = publications.map((p) => p.id);

  // Get the latest metric_event observed_at per publication
  const { data: metricEvents, error: meError } = await supabase
    .from("metric_events")
    .select("post_publication_id, observed_at")
    .in("post_publication_id", pubIds)
    .order("observed_at", { ascending: false });

  if (meError) throw new Error(meError.message);

  // Deduplicate: latest observed_at per publication
  const lastObserved = new Map<string, string>();
  for (const event of metricEvents ?? []) {
    if (!lastObserved.has(event.post_publication_id)) {
      lastObserved.set(event.post_publication_id, event.observed_at);
    }
  }

  // Filter to publications that are due for a fetch
  const now = Date.now();
  const due: PublicationDueForMetrics[] = [];

  for (const pub of publications) {
    const publishedAt = new Date(pub.published_at!);
    const interval = getMetricsFetchInterval(publishedAt);
    if (interval === null) continue; // too old

    const lastObs = lastObserved.get(pub.id);
    if (lastObs) {
      const elapsed = now - new Date(lastObs).getTime();
      if (elapsed < interval) continue; // fetched recently
    }

    const post = pub.posts as unknown as { id: string; user_id: string };
    due.push({
      id: pub.id,
      platform: pub.platform,
      platformPostId: pub.platform_post_id!,
      publishedAt: pub.published_at!,
      userId: post.user_id,
      postId: post.id,
    });
  }

  return due;
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
