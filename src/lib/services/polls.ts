import { createAdminClient } from "@/lib/supabase/admin";

export async function createPoll(
  postId: string,
  options: string[],
  durationMinutes: number,
) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("polls")
    .insert({
      post_id: postId,
      options: options as unknown as import("@/types/database").Json,
      duration_minutes: durationMinutes,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Failed to create poll: ${error.message}`);
  return data;
}

export async function getPollForPost(postId: string) {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("polls")
    .select("*")
    .eq("post_id", postId)
    .maybeSingle();

  return data;
}

export async function deletePoll(postId: string) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("polls")
    .delete()
    .eq("post_id", postId);

  if (error) throw new Error(`Failed to delete poll: ${error.message}`);
}
