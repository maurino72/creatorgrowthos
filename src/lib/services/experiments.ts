import { chatCompletion, extractJsonPayload } from "@/lib/ai/client";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type PlatformType = Database["public"]["Enums"]["platform_type"];
import { experimentSuggestionsArraySchema } from "@/lib/ai/experiments";
import {
  buildExperimentsPrompt,
  SUGGEST_EXPERIMENTS_TEMPLATE,
  SUGGEST_EXPERIMENTS_VERSION,
  type CreatorProfileContext,
} from "@/lib/ai/prompts";
import { getAggregatedData } from "./aggregation";
import { insertAiLog } from "./ai-logs";
import { getCreatorProfile } from "./profiles";

const MODEL = "gpt-4o-mini";

export const MIN_EXPERIMENT_POSTS = 15;

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
  platform?: PlatformType;
  limit?: number;
}

export async function suggestExperiments(userId: string, platform?: string) {
  // 1. Aggregate data
  const context = await getAggregatedData(userId, platform);

  // 2. Check minimum threshold
  if (context.creatorSummary.totalPosts < MIN_EXPERIMENT_POSTS) {
    throw new InsufficientDataError(context.creatorSummary.totalPosts);
  }

  // 3. Fetch creator profile for context
  const profile = await getCreatorProfile(userId);
  const creatorProfile: CreatorProfileContext | undefined = profile
    ? { niches: profile.niches ?? [], goals: profile.goals ?? [], targetAudience: profile.target_audience }
    : undefined;

  // 4. Build prompt
  const prompt = buildExperimentsPrompt(context, creatorProfile);

  // 4. Call OpenAI
  const result = await chatCompletion({
    model: MODEL,
    messages: [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ],
    maxTokens: 1200,
    temperature: 0.6,
    responseFormat: { type: "json_object" },
  });

  // 5. Parse and validate
  let suggestions;
  try {
    const arr = extractJsonPayload(result.content, { arrayKeys: ["experiments"] });
    suggestions = experimentSuggestionsArraySchema.parse(arr);
  } catch (parseError) {
    console.error("[experiments] Parse/validation failed", {
      error: parseError instanceof Error ? parseError.message : String(parseError),
      rawContentPreview: result.content.slice(0, 500),
      model: result.model,
    });

    await insertAiLog({
      userId,
      actionType: "suggest_experiments",
      model: MODEL,
      promptTemplate: SUGGEST_EXPERIMENTS_TEMPLATE,
      promptVersion: Number(SUGGEST_EXPERIMENTS_VERSION),
      contextPayload: { totalPosts: context.creatorSummary.totalPosts },
      fullPrompt: prompt.fullPrompt,
      response: result.content,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      latencyMs: result.latencyMs,
      wasUsed: false,
    });

    throw new Error("Failed to parse AI experiments response", { cause: parseError });
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
    response: result.content,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    latencyMs: result.latencyMs,
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
        platform: (platform as PlatformType) ?? null,
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
  const { status, platform, limit = 10 } = options;

  let query = supabase
    .from("experiments")
    .select("*")
    .eq("user_id", userId);

  if (status) {
    query = query.eq("status", status);
  }
  if (platform) {
    query = query.eq("platform", platform);
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
