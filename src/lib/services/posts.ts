import { createAdminClient } from "@/lib/supabase/admin";
import type { PlatformType } from "@/lib/adapters/types";
import type { Database } from "@/types/database";

export interface CreatePostData {
  body: string;
  platforms: PlatformType[];
  scheduled_at?: string;
  media_urls?: string[];
  tags?: string[];
  mentions?: string[];
}

export interface UpdatePostData {
  body?: string;
  platforms?: PlatformType[];
  scheduled_at?: string | null;
  media_urls?: string[] | null;
  tags?: string[] | null;
  mentions?: string[] | null;
}

export interface GetPostsOptions {
  status?: string;
  intent?: string;
  content_type?: string;
  topic?: string;
  tag?: string;
  mention?: string;
  platform?: string;
  limit?: number;
  offset?: number;
}

export async function createPost(userId: string, data: CreatePostData) {
  const supabase = createAdminClient();
  const status = data.scheduled_at ? ("scheduled" as const) : ("draft" as const);

  const insertPayload = {
    user_id: userId,
    body: data.body,
    status,
    scheduled_at: data.scheduled_at ?? null,
    media_urls: data.media_urls ?? [],
    tags: data.tags ?? [],
    mentions: data.mentions ?? [],
  };

  console.log("[createPost] inserting post", {
    userId,
    bodyLength: data.body.length,
    status,
    tags: data.tags,
    mentions: data.mentions,
    mediaUrls: data.media_urls?.length ?? 0,
    platforms: data.platforms,
  });

  const { data: post, error } = await supabase
    .from("posts")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    console.error("[createPost] posts insert failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      insertPayload: { ...insertPayload, body: insertPayload.body.slice(0, 50) },
    });
    throw new Error(`posts insert: ${error.code} — ${error.message} (hint: ${error.hint}, details: ${error.details})`);
  }

  console.log("[createPost] post created", { postId: post.id });

  // Create post_publications for each platform
  const publications = data.platforms.map((platform) => ({
    post_id: post.id,
    user_id: userId,
    platform,
    status: "pending" as const,
  }));

  const { error: pubError } = await supabase
    .from("post_publications")
    .insert(publications);

  if (pubError) {
    console.error("[createPost] post_publications insert failed", {
      code: pubError.code,
      message: pubError.message,
      details: pubError.details,
      hint: pubError.hint,
      postId: post.id,
      platforms: data.platforms,
    });
    throw new Error(`post_publications insert: ${pubError.code} — ${pubError.message}`);
  }

  return post;
}

export async function getPostsForUser(
  userId: string,
  options: GetPostsOptions = {},
) {
  const supabase = createAdminClient();
  const { status, intent, content_type, topic, tag, mention, platform, limit = 20, offset = 0 } = options;

  const selectClause = platform
    ? "*, post_publications!inner(*)"
    : "*, post_publications(*)";

  let query = supabase
    .from("posts")
    .select(selectClause)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (platform) {
    query = query.eq("post_publications.platform", platform as Database["public"]["Enums"]["platform_type"]);
  }

  if (status) {
    query = query.eq("status", status as Database["public"]["Enums"]["post_status"]);
  }
  if (intent) {
    query = query.eq("intent", intent);
  }
  if (content_type) {
    query = query.eq("content_type", content_type);
  }
  if (topic) {
    query = query.contains("topics", [topic]);
  }
  if (tag) {
    query = query.contains("tags", [tag]);
  }
  if (mention) {
    query = query.contains("mentions", [mention]);
  }

  const { data, error } = await query.range(offset, offset + limit - 1);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getPostById(userId: string, postId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("posts")
    .select("*, post_publications(*)")
    .eq("user_id", userId)
    .eq("id", postId)
    .is("deleted_at", null)
    .single();

  if (error && error.code === "PGRST116") return null;
  if (error) throw new Error(error.message);
  return data;
}

export async function updatePost(
  userId: string,
  postId: string,
  data: UpdatePostData,
) {
  const existing = await getPostById(userId, postId);
  if (!existing) throw new Error("Post not found");
  if (existing.status === "published") {
    throw new Error("Cannot edit a published post");
  }

  const updates: Record<string, unknown> = {};

  if (data.body !== undefined) {
    updates.body = data.body;
  }

  if (data.media_urls !== undefined) {
    updates.media_urls = data.media_urls ?? [];
  }

  if (data.tags !== undefined) {
    updates.tags = data.tags ?? [];
  }

  if (data.mentions !== undefined) {
    updates.mentions = data.mentions ?? [];
  }

  // Handle status transitions based on scheduled_at
  if (data.scheduled_at === null) {
    updates.scheduled_at = null;
    updates.status = "draft";
  } else if (data.scheduled_at !== undefined) {
    updates.scheduled_at = data.scheduled_at;
    updates.status = "scheduled";
  } else if (existing.status === "failed") {
    updates.status = "draft";
  }

  const supabase = createAdminClient();

  const { data: updated, error } = await supabase
    .from("posts")
    .update(updates)
    .eq("id", postId)
    .eq("user_id", userId)
    .select("*, post_publications(*)")
    .single();

  if (error) throw new Error(error.message);

  // If platforms changed, update post_publications
  if (data.platforms) {
    // Remove existing publications
    await supabase
      .from("post_publications")
      .delete()
      .eq("post_id", postId);

    // Insert new publications
    const publications = data.platforms.map((platform) => ({
      post_id: postId,
      user_id: userId,
      platform,
      status: "pending" as const,
    }));

    await supabase.from("post_publications").insert(publications);
  }

  return updated;
}

export async function deletePost(userId: string, postId: string) {
  const existing = await getPostById(userId, postId);
  if (!existing) throw new Error("Post not found");

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("posts")
    .update({
      status: "deleted",
      deleted_at: new Date().toISOString(),
    })
    .eq("id", postId)
    .eq("user_id", userId)
    .select("id")
    .single();

  if (error) throw new Error(error.message);
}
