import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase/admin";
import { ideasArraySchema, type ContentIdea } from "@/lib/ai/ideas";
import {
  buildIdeasPrompt,
  GENERATE_IDEAS_TEMPLATE,
  GENERATE_IDEAS_VERSION,
} from "@/lib/ai/prompts";
import { getAggregatedData } from "./aggregation";
import { insertAiLog } from "./ai-logs";

const MODEL = "gpt-4o-mini";

export const MIN_IDEATION_POSTS = 10;

function getOpenAIClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export class InsufficientDataError extends Error {
  constructor(totalPosts: number) {
    super(
      `Insufficient data: ${totalPosts} published posts, minimum ${MIN_IDEATION_POSTS} required`,
    );
    this.name = "InsufficientDataError";
  }
}

export async function generateContentIdeas(
  userId: string,
): Promise<ContentIdea[]> {
  // 1. Aggregate data
  const context = await getAggregatedData(userId);

  // 2. Check minimum threshold
  if (context.creatorSummary.totalPosts < MIN_IDEATION_POSTS) {
    throw new InsufficientDataError(context.creatorSummary.totalPosts);
  }

  // 3. Fetch recent posts to avoid repetition
  const supabase = createAdminClient();
  const { data: recentPostRows } = await supabase
    .from("posts")
    .select("body")
    .eq("user_id", userId)
    .eq("status", "published")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(10);

  const recentPosts = (recentPostRows ?? []).map(
    (r: { body: string }) => r.body,
  );

  // 4. Build prompt
  const prompt = buildIdeasPrompt(context, recentPosts);

  // 5. Call OpenAI
  const openai = getOpenAIClient();
  const startTime = Date.now();

  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.7,
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

  // 6. Parse and validate
  let ideas: ContentIdea[];
  try {
    const parsed = JSON.parse(rawContent);
    // AI might return { ideas: [...] } or just [...]
    const arr = Array.isArray(parsed) ? parsed : parsed.ideas;
    ideas = ideasArraySchema.parse(arr);
  } catch {
    await insertAiLog({
      userId,
      actionType: "generate_content_ideas",
      model: MODEL,
      promptTemplate: GENERATE_IDEAS_TEMPLATE,
      promptVersion: Number(GENERATE_IDEAS_VERSION),
      contextPayload: { totalPosts: context.creatorSummary.totalPosts },
      fullPrompt: prompt.fullPrompt,
      response: rawContent,
      tokensIn,
      tokensOut,
      latencyMs,
      wasUsed: false,
    });

    throw new Error("Failed to parse AI ideas response");
  }

  // 7. Log success
  await insertAiLog({
    userId,
    actionType: "generate_content_ideas",
    model: MODEL,
    promptTemplate: GENERATE_IDEAS_TEMPLATE,
    promptVersion: Number(GENERATE_IDEAS_VERSION),
    contextPayload: { totalPosts: context.creatorSummary.totalPosts },
    fullPrompt: prompt.fullPrompt,
    response: rawContent,
    tokensIn,
    tokensOut,
    latencyMs,
    wasUsed: true,
  });

  return ideas;
}
