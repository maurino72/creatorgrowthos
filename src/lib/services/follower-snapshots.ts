import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type PlatformEnum = Database["public"]["Enums"]["platform_type"];

// ─── Types ──────────────────────────────────────────────────────────────

export interface InsertFollowerSnapshotData {
  userId: string;
  platform: string;
  followerCount: number;
  newFollowers?: number | null;
  snapshotDate: string;
}

export interface FollowerGrowth {
  currentCount: number;
  startCount: number;
  netGrowth: number;
  growthRate: number;
  daily: {
    follower_count: number;
    new_followers: number | null;
    snapshot_date: string;
  }[];
}

// ─── Insert / Upsert ────────────────────────────────────────────────────

export async function insertFollowerSnapshot(data: InsertFollowerSnapshotData) {
  const supabase = createAdminClient();

  const { data: snapshot, error } = await supabase
    .from("follower_snapshots")
    .upsert(
      [
        {
          user_id: data.userId,
          platform: data.platform as "twitter" | "linkedin" | "threads",
          follower_count: data.followerCount,
          new_followers: data.newFollowers ?? null,
          snapshot_date: data.snapshotDate,
        },
      ],
      { onConflict: "user_id,platform,snapshot_date" },
    )
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return snapshot;
}

// ─── Query ──────────────────────────────────────────────────────────────

export async function getFollowerHistory(
  userId: string,
  platform: string,
  days: number,
) {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data, error } = await supabase
    .from("follower_snapshots")
    .select("*")
    .eq("user_id", userId)
    .eq("platform", platform as PlatformEnum)
    .gte("snapshot_date", since)
    .order("snapshot_date", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getLatestFollowerCount(
  userId: string,
  platform: string,
) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("follower_snapshots")
    .select("*")
    .eq("user_id", userId)
    .eq("platform", platform as PlatformEnum)
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code === "PGRST116") return null;
  if (error) throw new Error(error.message);
  return data;
}

export async function getFollowerGrowth(
  userId: string,
  platform: string,
  days: number,
): Promise<FollowerGrowth> {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data, error } = await supabase
    .from("follower_snapshots")
    .select("follower_count, new_followers, snapshot_date")
    .eq("user_id", userId)
    .eq("platform", platform as PlatformEnum)
    .gte("snapshot_date", since)
    .order("snapshot_date", { ascending: true });

  if (error) throw new Error(error.message);

  const snapshots = data ?? [];

  if (snapshots.length === 0) {
    return {
      currentCount: 0,
      startCount: 0,
      netGrowth: 0,
      growthRate: 0,
      daily: [],
    };
  }

  const startCount = snapshots[0].follower_count;
  const currentCount = snapshots[snapshots.length - 1].follower_count;
  const netGrowth = currentCount - startCount;
  const growthRate = startCount > 0 ? (netGrowth / startCount) * 100 : 0;

  return {
    currentCount,
    startCount,
    netGrowth,
    growthRate,
    daily: snapshots,
  };
}
