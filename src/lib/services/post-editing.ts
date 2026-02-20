import { createAdminClient } from "@/lib/supabase/admin";

export const MAX_EDITS = 5;
export const EDIT_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

interface EditablePost {
  status: string | null;
  edit_count: number;
  first_published_at: string | null;
  editable_until: string | null;
}

export function canEditPost(post: EditablePost): {
  canEdit: boolean;
  reason?: string;
  remainingEdits?: number;
  editableUntil?: Date;
} {
  if (post.status !== "published") {
    return { canEdit: false, reason: "Post must be published to edit" };
  }

  if (!post.first_published_at || !post.editable_until) {
    return { canEdit: false, reason: "Post missing publish timestamps" };
  }

  const editableUntil = new Date(post.editable_until);
  if (editableUntil <= new Date()) {
    return { canEdit: false, reason: "Edit window has expired" };
  }

  if (post.edit_count >= MAX_EDITS) {
    return { canEdit: false, reason: "Reached maximum number of edits" };
  }

  return {
    canEdit: true,
    remainingEdits: MAX_EDITS - post.edit_count,
    editableUntil,
  };
}

export async function editPublishedPost(
  userId: string,
  postId: string,
  newBody: string,
) {
  const supabase = createAdminClient();

  // Fetch the post
  const { data: post, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", postId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .single();

  if (error && error.code === "PGRST116") throw new Error("Post not found");
  if (error) throw new Error(error.message);
  if (!post) throw new Error("Post not found");

  const editCheck = canEditPost(post);
  if (!editCheck.canEdit) {
    throw new Error(`Post is not editable: ${editCheck.reason}`);
  }

  // Update the post
  const { data: updated, error: updateError } = await supabase
    .from("posts")
    .update({
      body: newBody,
      edit_count: (post.edit_count ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", postId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (updateError) throw new Error(`Failed to update post: ${updateError.message}`);
  return updated;
}
