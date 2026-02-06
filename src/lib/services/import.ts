import { createAdminClient } from "@/lib/supabase/admin";
import { TwitterAdapter, type TweetData } from "@/lib/adapters/twitter";
import { decrypt } from "@/lib/utils/encryption";
import { sendPostImported } from "@/lib/inngest/send";

export interface ImportResult {
  imported_count: number;
  failed_count: number;
  message: string;
  import_id: string;
}

export async function importTwitterPosts(
  userId: string,
  count: number,
): Promise<ImportResult> {
  const supabase = createAdminClient();

  // 1. Get active Twitter connection
  const { data: connection, error: connError } = await supabase
    .from("platform_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("platform", "twitter")
    .single();

  if (connError || !connection) {
    throw new Error("No active Twitter connection");
  }

  const accessToken = decrypt(connection.access_token_enc!);

  // 2. Create import tracking record
  const { data: importRecord, error: importError } = await supabase
    .from("content_imports")
    .insert({
      user_id: userId,
      platform: "twitter",
      requested_count: count,
      status: "pending",
    })
    .select()
    .single();

  if (importError) throw new Error(importError.message);

  // 3. Fetch tweets from Twitter
  const adapter = new TwitterAdapter();
  const { tweets } = await adapter.fetchUserTweets(
    accessToken,
    connection.platform_user_id!,
    count,
  );

  if (tweets.length === 0) {
    await supabase
      .from("content_imports")
      .update({
        imported_count: 0,
        failed_count: 0,
        status: "complete",
        completed_at: new Date().toISOString(),
      })
      .eq("id", importRecord.id);

    return {
      imported_count: 0,
      failed_count: 0,
      message: "No tweets found to import",
      import_id: importRecord.id,
    };
  }

  // 4. Create post records (status: published)
  const postInserts = tweets.map((tweet: TweetData) => ({
    user_id: userId,
    body: tweet.text,
    status: "published" as const,
    published_at: tweet.created_at,
    ai_assisted: false,
  }));

  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .insert(postInserts)
    .select("id");

  if (postsError) throw new Error(postsError.message);

  const postIds = posts.map((p: { id: string }) => p.id);

  // 5. Create post_publication records
  const publicationInserts = tweets.map((tweet: TweetData, i: number) => ({
    post_id: postIds[i],
    user_id: userId,
    platform: "twitter" as const,
    platform_post_id: tweet.id,
    platform_url: `https://twitter.com/i/status/${tweet.id}`,
    status: "published" as const,
    published_at: tweet.created_at,
  }));

  const { data: publications, error: pubError } = await supabase
    .from("post_publications")
    .insert(publicationInserts)
    .select("id");

  if (pubError) throw new Error(pubError.message);

  // 6. Create metric_events (using publication IDs, not post IDs)
  const metricInserts = tweets.map((tweet: TweetData, i: number) => ({
    post_publication_id: publications[i].id,
    user_id: userId,
    platform: "twitter" as const,
    impressions: tweet.public_metrics.impression_count,
    likes: tweet.public_metrics.like_count,
    replies: tweet.public_metrics.reply_count,
    reposts: tweet.public_metrics.retweet_count,
    observed_at: new Date().toISOString(),
    source: "import",
  }));

  await supabase.from("metric_events").insert(metricInserts);

  // 7. Update import record
  await supabase
    .from("content_imports")
    .update({
      imported_count: postIds.length,
      failed_count: 0,
      status: "complete",
      completed_at: new Date().toISOString(),
    })
    .eq("id", importRecord.id);

  // 8. Fire Inngest event for classification
  await sendPostImported(userId, postIds, postIds.length);

  return {
    imported_count: postIds.length,
    failed_count: 0,
    message: `Successfully imported ${postIds.length} posts`,
    import_id: importRecord.id,
  };
}
