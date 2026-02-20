import { createAdminClient } from "@/lib/supabase/admin";
import type { ThreadInput } from "@/lib/validators/threads";

export async function createThread(
  userId: string,
  input: ThreadInput,
) {
  const supabase = createAdminClient();

  // Create thread record
  const { data: thread, error: threadError } = await supabase
    .from("threads")
    .insert({
      user_id: userId,
      title: input.title ?? null,
      status: "draft",
    })
    .select("*")
    .single();

  if (threadError) throw new Error(`Failed to create thread: ${threadError.message}`);

  // Create posts with positions
  const postInserts = input.posts.map((p, index) => ({
    user_id: userId,
    body: p.body,
    media_urls: p.media_urls ?? [],
    is_thread: true,
    thread_id: thread.id,
    thread_position: index,
    status: "draft" as const,
  }));

  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .insert(postInserts)
    .select("*")
    .order("thread_position", { ascending: true });

  if (postsError) throw new Error(`Failed to create thread posts: ${postsError.message}`);

  return { thread, posts: posts ?? [] };
}

export async function getThreadPosts(threadId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("thread_id", threadId)
    .is("deleted_at", null)
    .order("thread_position", { ascending: true });

  if (error) throw new Error(`Failed to fetch thread posts: ${error.message}`);
  return data ?? [];
}

export async function getThreadsForUser(userId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("threads")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch threads: ${error.message}`);
  return data ?? [];
}

export async function deleteThread(threadId: string, userId: string) {
  const supabase = createAdminClient();

  // Soft-delete all posts in the thread
  await supabase
    .from("posts")
    .update({ deleted_at: new Date().toISOString(), status: "deleted" as const })
    .eq("thread_id", threadId)
    .eq("user_id", userId);

  // Delete the thread record
  const { error } = await supabase
    .from("threads")
    .delete()
    .eq("id", threadId);

  if (error) throw new Error(`Failed to delete thread: ${error.message}`);
}
