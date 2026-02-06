import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase/admin";
import { insightsArraySchema, MIN_POSTS } from "@/lib/ai/insights";
import {
  buildInsightsPrompt,
  GENERATE_INSIGHTS_TEMPLATE,
  GENERATE_INSIGHTS_VERSION,
} from "@/lib/ai/prompts";
import { getAggregatedData } from "./aggregation";
import { insertAiLog } from "./ai-logs";

const MODEL = "gpt-4o-mini";

function getOpenAIClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export class InsufficientDataError extends Error {
  constructor(totalPosts: number) {
    super(
      `Insufficient data: ${totalPosts} published posts, minimum ${MIN_POSTS} required`,
    );
    this.name = "InsufficientDataError";
  }
}

export interface GetInsightsOptions {
  status?: string;
  type?: string;
  limit?: number;
}

export async function generateInsights(userId: string, platform?: string) {
  // 1. Aggregate data
  const context = await getAggregatedData(userId, platform);

  // 2. Check minimum threshold
  if (context.creatorSummary.totalPosts < MIN_POSTS) {
    throw new InsufficientDataError(context.creatorSummary.totalPosts);
  }

  // 3. Build prompt
  const prompt = buildInsightsPrompt(context);

  // 4. Call OpenAI
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

  // 5. Parse and validate
  let insights;
  try {
    const parsed = JSON.parse(rawContent);
    // AI might return { insights: [...] } or just [...]
    const arr = Array.isArray(parsed) ? parsed : parsed.insights;
    insights = insightsArraySchema.parse(arr);
  } catch {
    await insertAiLog({
      userId,
      actionType: "generate_insights",
      model: MODEL,
      promptTemplate: GENERATE_INSIGHTS_TEMPLATE,
      promptVersion: Number(GENERATE_INSIGHTS_VERSION),
      contextPayload: { totalPosts: context.creatorSummary.totalPosts },
      fullPrompt: prompt.fullPrompt,
      response: rawContent,
      tokensIn,
      tokensOut,
      latencyMs,
      wasUsed: false,
    });

    throw new Error("Failed to parse AI insights response");
  }

  // 6. Log success
  await insertAiLog({
    userId,
    actionType: "generate_insights",
    model: MODEL,
    promptTemplate: GENERATE_INSIGHTS_TEMPLATE,
    promptVersion: Number(GENERATE_INSIGHTS_VERSION),
    contextPayload: { totalPosts: context.creatorSummary.totalPosts },
    fullPrompt: prompt.fullPrompt,
    response: rawContent,
    tokensIn,
    tokensOut,
    latencyMs,
    wasUsed: true,
  });

  // 7. Store insights
  const supabase = createAdminClient();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const stored = [];
  for (const insight of insights) {
    const { data: row, error } = await supabase
      .from("insights")
      .insert({
        user_id: userId,
        type: insight.type,
        headline: insight.headline,
        detail: insight.detail,
        data_points: insight.data_points,
        action: insight.action,
        confidence: insight.confidence,
        status: "active",
        generated_at: new Date().toISOString(),
        expires_at: expiresAt,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    stored.push(row);
  }

  return stored;
}

export async function getInsightsForUser(
  userId: string,
  options: GetInsightsOptions = {},
) {
  const supabase = createAdminClient();
  const { status = "active", type, limit = 10 } = options;

  let query = supabase
    .from("insights")
    .select("*")
    .eq("user_id", userId);

  if (status) {
    query = query.eq("status", status);
  }
  if (type) {
    query = query.eq("type", type);
  }

  const { data, error } = await query
    .order("generated_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function dismissInsight(userId: string, insightId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("insights")
    .update({ status: "dismissed" })
    .eq("id", insightId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function markInsightActedOn(userId: string, insightId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("insights")
    .update({ status: "acted_on" })
    .eq("id", insightId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getEligibleUsersForInsights(): Promise<string[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("posts")
    .select("user_id")
    .eq("status", "published")
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  // Count posts per user, filter to those with >= MIN_POSTS
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.user_id] = (counts[row.user_id] ?? 0) + 1;
  }

  return Object.entries(counts)
    .filter(([, count]) => count >= MIN_POSTS)
    .map(([userId]) => userId);
}
