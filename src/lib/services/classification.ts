import { chatCompletion, extractJsonPayload } from "@/lib/ai/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { classificationSchema, normalizeTopics, type Classification } from "@/lib/ai/taxonomy";
import {
  buildClassifyPrompt,
  CLASSIFY_POST_TEMPLATE,
  CLASSIFY_POST_VERSION,
} from "@/lib/ai/prompts";
import { insertAiLog } from "./ai-logs";

const MODEL = "gpt-4o-mini";

export async function classifyPost(
  userId: string,
  postId: string,
): Promise<Classification> {
  const supabase = createAdminClient();

  // 1. Fetch post
  const { data: post, error: fetchError } = await supabase
    .from("posts")
    .select("id, user_id, body, status")
    .eq("user_id", userId)
    .eq("id", postId)
    .is("deleted_at", null)
    .single();

  if (fetchError || !post) {
    throw new Error("Post not found");
  }

  // 2. Build prompt
  const prompt = buildClassifyPrompt(post.body);

  // 3. Call OpenAI
  const result = await chatCompletion({
    model: MODEL,
    messages: [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ],
    maxTokens: 200,
    temperature: 0.3,
    responseFormat: { type: "json_object" },
  });

  // 4. Parse and validate
  let classification: Classification;
  try {
    const parsed = extractJsonPayload(result.content);
    classification = classificationSchema.parse(parsed);
    classification.topics = normalizeTopics(classification.topics);
  } catch (parseError) {
    console.error("[classification] Parse/validation failed", {
      error: parseError instanceof Error ? parseError.message : String(parseError),
      rawContentPreview: result.content.slice(0, 500),
      model: result.model,
    });

    // Log failed attempt
    await insertAiLog({
      userId,
      actionType: "classify_post",
      model: MODEL,
      promptTemplate: CLASSIFY_POST_TEMPLATE,
      promptVersion: Number(CLASSIFY_POST_VERSION),
      contextPayload: { post_id: postId, body_preview: post.body.slice(0, 100) },
      fullPrompt: prompt.fullPrompt,
      response: result.content,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      latencyMs: result.latencyMs,
      wasUsed: false,
    });

    throw new Error("Failed to parse AI classification response", { cause: parseError });
  }

  // 5. Update post
  const { error: updateError } = await supabase
    .from("posts")
    .update({
      intent: classification.intent,
      content_type: classification.content_type,
      topics: classification.topics,
      ai_assisted: true,
    })
    .eq("id", postId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (updateError) {
    throw new Error(updateError.message);
  }

  // 6. Log successful classification
  await insertAiLog({
    userId,
    actionType: "classify_post",
    model: MODEL,
    promptTemplate: CLASSIFY_POST_TEMPLATE,
    promptVersion: Number(CLASSIFY_POST_VERSION),
    contextPayload: { post_id: postId, body_preview: post.body.slice(0, 100) },
    fullPrompt: prompt.fullPrompt,
    response: result.content,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    latencyMs: result.latencyMs,
    wasUsed: true,
  });

  return classification;
}

export async function updateClassifications(
  userId: string,
  postId: string,
  data: { intent?: string; content_type?: string; topics?: string[] },
) {
  const supabase = createAdminClient();

  const updates: Record<string, unknown> = {
    ai_assisted: false,
  };

  if (data.intent !== undefined) {
    updates.intent = data.intent;
  }
  if (data.content_type !== undefined) {
    updates.content_type = data.content_type;
  }
  if (data.topics !== undefined) {
    updates.topics = normalizeTopics(data.topics);
  }

  const { data: updated, error } = await supabase
    .from("posts")
    .update(updates)
    .eq("id", postId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return updated;
}

export async function getPostsNeedingClassification(limit: number = 20) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("posts")
    .select("id, user_id, body")
    .is("intent", null)
    .neq("status", "deleted")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}
