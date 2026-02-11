import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  improvementResponseSchema,
  type ImprovementResponse,
} from "@/lib/ai/improvement";
import {
  buildImprovePrompt,
  IMPROVE_CONTENT_TEMPLATE,
  IMPROVE_CONTENT_VERSION,
  type CreatorProfileContext,
} from "@/lib/ai/prompts";
import { insertAiLog } from "./ai-logs";
import { getCreatorProfile } from "./profiles";

const MODEL = "gpt-4o-mini";

function getOpenAIClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function improveContent(
  userId: string,
  content: string,
): Promise<ImprovementResponse> {
  // 1. Fetch top performing posts for style reference
  const supabase = createAdminClient();
  const { data: topPostRows } = await supabase
    .from("metric_events")
    .select("posts:post_publications!inner(posts!inner(body))")
    .eq("post_publications.posts.user_id", userId)
    .is("post_publications.posts.deleted_at", null)
    .order("impressions", { ascending: false })
    .limit(5);

  const topPosts = (topPostRows ?? []).map(
    (r) => (r as unknown as { posts: { body: string } }).posts.body,
  );

  // 2. Fetch creator profile for context
  const profile = await getCreatorProfile(userId);
  const creatorProfile: CreatorProfileContext | undefined = profile
    ? { niches: profile.niches ?? [], goals: profile.goals ?? [], targetAudience: profile.target_audience }
    : undefined;

  // 3. Build prompt
  const prompt = buildImprovePrompt(content, topPosts, creatorProfile);

  // 3. Call OpenAI
  const openai = getOpenAIClient();
  const startTime = Date.now();

  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.5,
    max_tokens: 1500,
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
  let result: ImprovementResponse;
  try {
    const parsed = JSON.parse(rawContent);
    result = improvementResponseSchema.parse(parsed);
  } catch {
    await insertAiLog({
      userId,
      actionType: "improve_content",
      model: MODEL,
      promptTemplate: IMPROVE_CONTENT_TEMPLATE,
      promptVersion: Number(IMPROVE_CONTENT_VERSION),
      contextPayload: { contentLength: content.length },
      fullPrompt: prompt.fullPrompt,
      response: rawContent,
      tokensIn,
      tokensOut,
      latencyMs,
      wasUsed: false,
    });

    throw new Error("Failed to parse AI improvement response");
  }

  // 5. Log success
  await insertAiLog({
    userId,
    actionType: "improve_content",
    model: MODEL,
    promptTemplate: IMPROVE_CONTENT_TEMPLATE,
    promptVersion: Number(IMPROVE_CONTENT_VERSION),
    contextPayload: { contentLength: content.length },
    fullPrompt: prompt.fullPrompt,
    response: rawContent,
    tokensIn,
    tokensOut,
    latencyMs,
    wasUsed: true,
  });

  return result;
}
