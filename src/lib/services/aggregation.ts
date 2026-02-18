import { createAdminClient } from "@/lib/supabase/admin";
import { TTLCache } from "@/lib/utils/cache";
import type { Database } from "@/types/database";

export interface PerformanceByCategory {
  avgImpressions: number;
  avgEngagement: number;
  avgEngagementRate: number;
  count: number;
}

export interface OutlierPost {
  id: string;
  body: string;
  intent: string | null;
  topics: string[] | null;
  impressions: number;
  engagement: number;
  engagementRate: number;
}

export interface PeriodMetrics {
  postCount: number;
  avgImpressions: number;
  avgEngagement: number;
  avgEngagementRate: number;
}

export interface InsightContext {
  creatorSummary: {
    totalPosts: number;
    postsWithMetrics: number;
    platforms: string[];
    earliestPost: string | null;
    latestPost: string | null;
  };
  byIntent: Record<string, PerformanceByCategory>;
  byTopic: Record<string, PerformanceByCategory>;
  byContentType: Record<string, PerformanceByCategory>;
  recentTrend: {
    currentPeriod: PeriodMetrics;
    previousPeriod: PeriodMetrics;
  };
  outliers: {
    top: OutlierPost[];
    bottom: OutlierPost[];
  };
  postingPattern: {
    totalDays: number;
    postsPerWeek: number;
  };
}

interface PostWithMetrics {
  id: string;
  body: string;
  status: string;
  intent: string | null;
  content_type: string | null;
  topics: string[] | null;
  published_at: string | null;
  created_at: string;
  post_publications: {
    platform: string;
    status: string;
    metric_events: {
      impressions?: number;
      likes?: number;
      replies?: number;
      reposts?: number;
      engagement_rate?: number | null;
      observed_at: string;
    }[];
  }[];
}

function getLatestMetrics(post: PostWithMetrics) {
  let bestEvent: PostWithMetrics["post_publications"][number]["metric_events"][number] | null = null;

  for (const pub of post.post_publications) {
    for (const event of pub.metric_events) {
      if (!bestEvent || event.observed_at > bestEvent.observed_at) {
        bestEvent = event;
      }
    }
  }

  if (!bestEvent) return null;

  const impressions = bestEvent.impressions ?? 0;
  const likes = bestEvent.likes ?? 0;
  const replies = bestEvent.replies ?? 0;
  const reposts = bestEvent.reposts ?? 0;

  return {
    impressions,
    engagement: likes + replies + reposts,
    engagementRate: bestEvent.engagement_rate ?? 0,
  };
}

function computeAvg(items: { impressions: number; engagement: number; engagementRate: number }[]): PerformanceByCategory {
  if (items.length === 0) {
    return { avgImpressions: 0, avgEngagement: 0, avgEngagementRate: 0, count: 0 };
  }
  const sum = items.reduce(
    (acc, m) => ({
      impressions: acc.impressions + m.impressions,
      engagement: acc.engagement + m.engagement,
      engagementRate: acc.engagementRate + m.engagementRate,
    }),
    { impressions: 0, engagement: 0, engagementRate: 0 },
  );

  return {
    avgImpressions: sum.impressions / items.length,
    avgEngagement: sum.engagement / items.length,
    avgEngagementRate: sum.engagementRate / items.length,
    count: items.length,
  };
}

const aggregationCache = new TTLCache<InsightContext>(5 * 60 * 1000); // 5 min

export function clearAggregationCache(): void {
  aggregationCache.clear();
}

export async function getAggregatedData(userId: string, platform?: string): Promise<InsightContext> {
  const cacheKey = `${userId}:${platform ?? "all"}`;
  const cached = aggregationCache.get(cacheKey);
  if (cached) return cached;

  const supabase = createAdminClient();

  const selectClause = platform
    ? "*, post_publications!inner(*, metric_events(*))"
    : "*, post_publications(*, metric_events(*))";

  let query = supabase
    .from("posts")
    .select(selectClause)
    .eq("user_id", userId)
    .eq("status", "published")
    .is("deleted_at", null);

  if (platform) {
    query = query.eq("post_publications.platform", platform as Database["public"]["Enums"]["platform_type"]);
  }

  const { data: posts, error } = await query.order("published_at", { ascending: false });

  if (error) throw new Error(error.message);

  const allPosts = (posts ?? []) as PostWithMetrics[];

  // Extract metrics per post
  const postsWithMetrics: { post: PostWithMetrics; metrics: { impressions: number; engagement: number; engagementRate: number } }[] = [];

  for (const post of allPosts) {
    const metrics = getLatestMetrics(post);
    if (metrics) {
      postsWithMetrics.push({ post, metrics });
    }
  }

  // Creator summary
  const platforms = new Set<string>();
  for (const post of allPosts) {
    for (const pub of post.post_publications) {
      platforms.add(pub.platform);
    }
  }

  const dates = allPosts
    .map((p) => p.published_at)
    .filter((d): d is string => d != null)
    .sort();

  const creatorSummary = {
    totalPosts: allPosts.length,
    postsWithMetrics: postsWithMetrics.length,
    platforms: Array.from(platforms),
    earliestPost: dates[0] ?? null,
    latestPost: dates[dates.length - 1] ?? null,
  };

  // Performance by intent
  const byIntent: Record<string, PerformanceByCategory> = {};
  const intentGroups: Record<string, { impressions: number; engagement: number; engagementRate: number }[]> = {};

  for (const { post, metrics } of postsWithMetrics) {
    if (!post.intent) continue;
    if (!intentGroups[post.intent]) intentGroups[post.intent] = [];
    intentGroups[post.intent].push(metrics);
  }

  for (const [intent, items] of Object.entries(intentGroups)) {
    byIntent[intent] = computeAvg(items);
  }

  // Performance by topic
  const byTopic: Record<string, PerformanceByCategory> = {};
  const topicGroups: Record<string, { impressions: number; engagement: number; engagementRate: number }[]> = {};

  for (const { post, metrics } of postsWithMetrics) {
    if (!post.topics) continue;
    for (const topic of post.topics) {
      if (!topicGroups[topic]) topicGroups[topic] = [];
      topicGroups[topic].push(metrics);
    }
  }

  for (const [topic, items] of Object.entries(topicGroups)) {
    byTopic[topic] = computeAvg(items);
  }

  // Performance by content type
  const byContentType: Record<string, PerformanceByCategory> = {};
  const typeGroups: Record<string, { impressions: number; engagement: number; engagementRate: number }[]> = {};

  for (const { post, metrics } of postsWithMetrics) {
    if (!post.content_type) continue;
    if (!typeGroups[post.content_type]) typeGroups[post.content_type] = [];
    typeGroups[post.content_type].push(metrics);
  }

  for (const [contentType, items] of Object.entries(typeGroups)) {
    byContentType[contentType] = computeAvg(items);
  }

  // Recent trend: last 30d vs previous 30d
  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

  const currentPeriodPosts = postsWithMetrics.filter(
    ({ post }) => post.published_at && new Date(post.published_at).getTime() > now - thirtyDaysMs,
  );
  const previousPeriodPosts = postsWithMetrics.filter(
    ({ post }) =>
      post.published_at &&
      new Date(post.published_at).getTime() <= now - thirtyDaysMs &&
      new Date(post.published_at).getTime() > now - 2 * thirtyDaysMs,
  );

  const currentMetrics = currentPeriodPosts.map(({ metrics }) => metrics);
  const previousMetrics = previousPeriodPosts.map(({ metrics }) => metrics);

  const recentTrend = {
    currentPeriod: {
      postCount: currentPeriodPosts.length,
      ...computeAvg(currentMetrics),
    },
    previousPeriod: {
      postCount: previousPeriodPosts.length,
      ...computeAvg(previousMetrics),
    },
  };

  // Outliers: top 3 and bottom 3 by engagement rate
  const sorted = [...postsWithMetrics].sort(
    (a, b) => b.metrics.engagementRate - a.metrics.engagementRate,
  );

  const toOutlier = ({ post, metrics }: typeof postsWithMetrics[number]): OutlierPost => ({
    id: post.id,
    body: post.body.slice(0, 100),
    intent: post.intent,
    topics: post.topics,
    impressions: metrics.impressions,
    engagement: metrics.engagement,
    engagementRate: metrics.engagementRate,
  });

  const outliers = {
    top: sorted.slice(0, 3).map(toOutlier),
    bottom: sorted.slice(-3).reverse().map(toOutlier),
  };

  // Posting pattern
  let totalDays = 1;
  if (dates.length >= 2) {
    totalDays = Math.max(
      1,
      Math.ceil((new Date(dates[dates.length - 1]).getTime() - new Date(dates[0]).getTime()) / (24 * 60 * 60 * 1000)),
    );
  }

  const postsPerWeek = allPosts.length > 0 ? (allPosts.length / totalDays) * 7 : 0;

  const result: InsightContext = {
    creatorSummary,
    byIntent,
    byTopic,
    byContentType,
    recentTrend,
    outliers,
    postingPattern: {
      totalDays,
      postsPerWeek,
    },
  };

  aggregationCache.set(cacheKey, result);
  return result;
}
