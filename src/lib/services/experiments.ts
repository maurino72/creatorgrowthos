import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase/admin";
import { experimentSuggestionsArraySchema } from "@/lib/ai/experiments";
import {
  buildExperimentsPrompt,
  SUGGEST_EXPERIMENTS_TEMPLATE,
  SUGGEST_EXPERIMENTS_VERSION,
} from "@/lib/ai/prompts";
import { getAggregatedData } from "./aggregation";
import { insertAiLog } from "./ai-logs";

const MODEL = "gpt-4o-mini";

export const MIN_EXPERIMENT_POSTS = 15;

function getOpenAIClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export class InsufficientDataError extends Error {
  constructor(totalPosts: number) {
    super(
      `Insufficient data: ${totalPosts} published posts, minimum ${MIN_EXPERIMENT_POSTS} required`,
    );
    this.name = "InsufficientDataError";
  }
}

export interface GetExperimentsOptions {
  status?: string;
  limit?: number;
}

export async function suggestExperiments(userId: string, platform?: string) {
  // 1. Aggregate data
  const context = await getAggregatedData(userId, platform);

  // 2. Check minimum threshold
  if (context.creatorSummary.totalPosts < MIN_EXPERIMENT_POSTS) {
    throw new InsufficientDataError(context.creatorSummary.totalPosts);
  }

  // 3. Build prompt
  const prompt = buildExperimentsPrompt(context);

  // 4. Call OpenAI
  const openai = getOpenAIClient();
  const startTime = Date.now();

  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.6,
    max_tokens: 1200,
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
  let suggestions;
  try {
    const parsed = JSON.parse(rawContent);
    const arr = Array.isArray(parsed) ? parsed : parsed.experiments;
    suggestions = experimentSuggestionsArraySchema.parse(arr);
  } catch {
    await insertAiLog({
      userId,
      actionType: "suggest_experiments",
      model: MODEL,
      promptTemplate: SUGGEST_EXPERIMENTS_TEMPLATE,
      promptVersion: Number(SUGGEST_EXPERIMENTS_VERSION),
      contextPayload: { totalPosts: context.creatorSummary.totalPosts },
      fullPrompt: prompt.fullPrompt,
      response: rawContent,
      tokensIn,
      tokensOut,
      latencyMs,
      wasUsed: false,
    });

    throw new Error("Failed to parse AI experiments response");
  }

  // 6. Log success
  await insertAiLog({
    userId,
    actionType: "suggest_experiments",
    model: MODEL,
    promptTemplate: SUGGEST_EXPERIMENTS_TEMPLATE,
    promptVersion: Number(SUGGEST_EXPERIMENTS_VERSION),
    contextPayload: { totalPosts: context.creatorSummary.totalPosts },
    fullPrompt: prompt.fullPrompt,
    response: rawContent,
    tokensIn,
    tokensOut,
    latencyMs,
    wasUsed: true,
  });

  // 7. Store suggestions
  const supabase = createAdminClient();
  const stored = [];
  for (const suggestion of suggestions) {
    const { data: row, error } = await supabase
      .from("experiments")
      .insert({
        user_id: userId,
        type: suggestion.type,
        hypothesis: suggestion.hypothesis,
        description: suggestion.description,
        status: "suggested",
        results: { recommended_action: suggestion.recommended_action, confidence: suggestion.confidence },
        suggested_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    stored.push(row);
  }

  return stored;
}

export async function getExperimentsForUser(
  userId: string,
  options: GetExperimentsOptions = {},
) {
  const supabase = createAdminClient();
  const { status, limit = 10 } = options;

  let query = supabase
    .from("experiments")
    .select("*")
    .eq("user_id", userId);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query
    .order("suggested_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function acceptExperiment(userId: string, experimentId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("experiments")
    .update({ status: "accepted", started_at: new Date().toISOString() })
    .eq("id", experimentId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function dismissExperiment(userId: string, experimentId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("experiments")
    .update({ status: "dismissed" })
    .eq("id", experimentId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}
