import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase/admin";
import { classificationSchema, normalizeTopics, type Classification } from "@/lib/ai/taxonomy";
import {
  buildClassifyPrompt,
  CLASSIFY_POST_TEMPLATE,
  CLASSIFY_POST_VERSION,
} from "@/lib/ai/prompts";
import { insertAiLog } from "./ai-logs";

const MODEL = "gpt-4o-mini";

function getOpenAIClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

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
  const openai = getOpenAIClient();
  const startTime = Date.now();

  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.3,
    max_tokens: 200,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ],
  });

  const latencyMs = Date.now() - startTime;
  const rawContent = completion.choices[0]?.message?.content ?? "";
  const tokensIn = completion.usage?.prompt_tokens ?? 0;
  const tokensOut = completion.usage?.completion_tokens ?? 0;

  // 4. Parse and validate
  let classification: Classification;
  try {
    const parsed = JSON.parse(rawContent);
    classification = classificationSchema.parse(parsed);
    classification.topics = normalizeTopics(classification.topics);
  } catch {
    // Log failed attempt
    await insertAiLog({
      userId,
      actionType: "classify_post",
      model: MODEL,
      promptTemplate: CLASSIFY_POST_TEMPLATE,
      promptVersion: Number(CLASSIFY_POST_VERSION),
      contextPayload: { post_id: postId, body_preview: post.body.slice(0, 100) },
      fullPrompt: prompt.fullPrompt,
      response: rawContent,
      tokensIn,
      tokensOut,
      latencyMs,
      wasUsed: false,
    });

    throw new Error("Failed to parse AI classification response");
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
    response: rawContent,
    tokensIn,
    tokensOut,
    latencyMs,
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
