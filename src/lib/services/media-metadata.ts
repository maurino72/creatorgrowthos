import { createAdminClient } from "@/lib/supabase/admin";

export async function getAltTextsForPost(
  postId: string,
): Promise<Record<string, string>> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("media_alt_texts")
    .select("*")
    .eq("post_id", postId);

  if (error) throw new Error(`Failed to fetch alt texts: ${error.message}`);

  const result: Record<string, string> = {};
  for (const row of data ?? []) {
    result[row.media_url] = row.alt_text;
  }
  return result;
}

export async function saveAltTexts(
  postId: string,
  altTexts: Record<string, string>,
) {
  if (Object.keys(altTexts).length === 0) return [];

  const supabase = createAdminClient();

  // Delete existing alt texts for this post
  await supabase.from("media_alt_texts").delete().eq("post_id", postId);

  // Insert new ones
  const inserts = Object.entries(altTexts).map(([mediaUrl, altText]) => ({
    post_id: postId,
    media_url: mediaUrl,
    alt_text: altText,
  }));

  const { data, error } = await supabase
    .from("media_alt_texts")
    .insert(inserts)
    .select("*");

  if (error) throw new Error(`Failed to save alt texts: ${error.message}`);
  return data ?? [];
}
