import { createAdminClient } from "@/lib/supabase/admin";
import type { PlatformType } from "@/lib/adapters/types";
import type { Database } from "@/types/database";

type PlatformEnum = Database["public"]["Enums"]["platform_type"];

// ─── Types ──────────────────────────────────────────────────────────────

export interface InsertMetricSnapshotData {
  userId: string;
  platform: PlatformType | string;
  postId?: string | null;
  platformPostId: string;
  impressions?: number | null;
  uniqueReach?: number | null;
  reactions?: number | null;
  comments?: number | null;
  shares?: number | null;
  quotes?: number | null;
  bookmarks?: number | null;
  videoPlays?: number | null;
  videoWatchTimeMs?: number | null;
  videoUniqueViewers?: number | null;
}

export interface LogMetricFetchData {
  userId: string;
  platform: string;
  platformPostId?: string;
  fetchType: string;
  status: string;
  errorMessage?: string;
  apiCallsUsed: number;
}

export interface GetSnapshotsOptions {
  limit?: number;
  since?: string;
}

// ─── Insert ─────────────────────────────────────────────────────────────

export async function insertMetricSnapshot(data: InsertMetricSnapshotData) {
  const supabase = createAdminClient();

  const { data: snapshot, error } = await supabase
    .from("metric_snapshots")
    .insert({
      user_id: data.userId,
      platform: data.platform as PlatformEnum,
      post_id: data.postId ?? null,
      platform_post_id: data.platformPostId,
      impressions: data.impressions ?? null,
      unique_reach: data.uniqueReach ?? null,
      reactions: data.reactions ?? null,
      comments: data.comments ?? null,
      shares: data.shares ?? null,
      quotes: data.quotes ?? null,
      bookmarks: data.bookmarks ?? null,
      video_plays: data.videoPlays ?? null,
      video_watch_time_ms: data.videoWatchTimeMs ?? null,
      video_unique_viewers: data.videoUniqueViewers ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return snapshot;
}

// ─── Query ──────────────────────────────────────────────────────────────

export async function getLatestSnapshotForPost(
  userId: string,
  platformPostId: string,
  platform: string,
) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("metric_snapshots")
    .select("*")
    .eq("user_id", userId)
    .eq("platform_post_id", platformPostId)
    .eq("platform", platform as PlatformEnum)
    .order("fetched_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code === "PGRST116") return null;
  if (error) throw new Error(error.message);
  return data;
}

export async function getSnapshotsForPost(
  userId: string,
  platformPostId: string,
  platform: string,
  options: GetSnapshotsOptions = {},
) {
  const supabase = createAdminClient();
  const { limit = 100, since } = options;

  let query = supabase
    .from("metric_snapshots")
    .select("*")
    .eq("user_id", userId)
    .eq("platform_post_id", platformPostId)
    .eq("platform", platform as PlatformEnum);

  if (since) {
    query = query.gte("fetched_at", since);
  }

  const { data, error } = await query
    .order("fetched_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getLatestSnapshotsBatch(
  userId: string,
  platformPostIds: string[],
) {
  if (platformPostIds.length === 0) return {};

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("metric_snapshots")
    .select("*")
    .eq("user_id", userId)
    .in("platform_post_id", platformPostIds)
    .order("fetched_at", { ascending: false });

  if (error) throw new Error(error.message);

  // Deduplicate: keep only the latest per platform_post_id
  const result: Record<string, (typeof data)[number]> = {};
  for (const snapshot of data ?? []) {
    if (!result[snapshot.platform_post_id]) {
      result[snapshot.platform_post_id] = snapshot;
    }
  }

  return result;
}

// ─── Fetch Logging ──────────────────────────────────────────────────────

export async function logMetricFetch(data: LogMetricFetchData) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("metric_fetch_log")
    .insert({
      user_id: data.userId,
      platform: data.platform,
      platform_post_id: data.platformPostId ?? null,
      fetch_type: data.fetchType,
      status: data.status,
      error_message: data.errorMessage ?? null,
      api_calls_used: data.apiCallsUsed,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
}

export async function getApiCallsUsedToday(
  userId: string,
  platform: string,
): Promise<number> {
  const supabase = createAdminClient();

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("metric_fetch_log")
    .select("api_calls_used")
    .eq("user_id", userId)
    .eq("platform", platform as PlatformEnum)
    .gte("fetched_at", todayStart.toISOString());

  if (error) throw new Error(error.message);

  return (data ?? []).reduce(
    (sum, row) => sum + (row.api_calls_used ?? 0),
    0,
  );
}

// ─── Decay-Based Polling ────────────────────────────────────────────────

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

interface DecaySchedule {
  maxAge: number;
  interval: number;
}

const LINKEDIN_DECAY: DecaySchedule[] = [
  { maxAge: 2 * HOUR, interval: 30 * MINUTE },
  { maxAge: 6 * HOUR, interval: 1 * HOUR },
  { maxAge: 24 * HOUR, interval: 3 * HOUR },
  { maxAge: 3 * DAY, interval: 12 * HOUR },
  { maxAge: 7 * DAY, interval: 1 * DAY },
  { maxAge: 30 * DAY, interval: 3 * DAY },
  { maxAge: 90 * DAY, interval: 7 * DAY },
];

const TWITTER_DECAY: DecaySchedule[] = [
  { maxAge: 2 * HOUR, interval: 15 * MINUTE },
  { maxAge: 6 * HOUR, interval: 30 * MINUTE },
  { maxAge: 24 * HOUR, interval: 1 * HOUR },
  { maxAge: 3 * DAY, interval: 6 * HOUR },
  { maxAge: 7 * DAY, interval: 12 * HOUR },
  { maxAge: 30 * DAY, interval: 1 * DAY },
  { maxAge: 90 * DAY, interval: 3 * DAY },
  { maxAge: Infinity, interval: 7 * DAY },
];

export function getDecayInterval(
  publishedAt: Date,
  platform: string,
): number | null {
  const ageMs = Date.now() - publishedAt.getTime();
  const schedule = platform === "linkedin" ? LINKEDIN_DECAY : TWITTER_DECAY;

  for (const { maxAge, interval } of schedule) {
    if (ageMs < maxAge) return interval;
  }

  // LinkedIn stops polling after 90 days; Twitter continues weekly
  return null;
}
