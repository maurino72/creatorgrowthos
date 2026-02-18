import { chatCompletion, extractJsonPayload } from "@/lib/ai/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { ideasArraySchema, type ContentIdea } from "@/lib/ai/ideas";
import {
  buildIdeasPrompt,
  GENERATE_IDEAS_TEMPLATE,
  GENERATE_IDEAS_VERSION,
  type CreatorProfileContext,
} from "@/lib/ai/prompts";
import { TTLCache } from "@/lib/utils/cache";
import { getAggregatedData } from "./aggregation";
import { insertAiLog } from "./ai-logs";
import { getCreatorProfile } from "./profiles";
import { fetchTrendingTopics } from "./trending";

const MODEL = "gpt-5";

export const MIN_IDEATION_POSTS = 10;

const recentPostsCache = new TTLCache<string[]>(5 * 60 * 1000); // 5 min

export function clearIdeationCache(): void {
  recentPostsCache.clear();
}

async function fetchRecentPosts(userId: string): Promise<string[]> {
  const cached = recentPostsCache.get(userId);
  if (cached) return cached;

  const supabase = createAdminClient();
  const { data: recentPostRows } = await supabase
    .from("posts")
    .select("body")
    .eq("user_id", userId)
    .eq("status", "published")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(10);

  const posts = (recentPostRows ?? []).map((r: { body: string }) => r.body);
  recentPostsCache.set(userId, posts);
  return posts;
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
  // 1. Run independent data fetches in parallel (all cached with TTL)
  const contextPromise = getAggregatedData(userId);
  const recentPostsPromise = fetchRecentPosts(userId);
  const profilePromise = getCreatorProfile(userId);

  // Chain trending off profile — starts as soon as profile resolves
  const trendingPromise = profilePromise.then((profile) => {
    const niches = profile?.niches ?? [];
    return niches.length > 0 ? fetchTrendingTopics(niches) : [];
  });

  const [context, recentPosts, profile, trendingTopics] = await Promise.all([
    contextPromise,
    recentPostsPromise,
    profilePromise,
    trendingPromise,
  ]);

  // 2. Check minimum threshold
  if (context.creatorSummary.totalPosts < MIN_IDEATION_POSTS) {
    throw new InsufficientDataError(context.creatorSummary.totalPosts);
  }

  const creatorProfile: CreatorProfileContext | undefined = profile
    ? { niches: profile.niches ?? [], goals: profile.goals ?? [], targetAudience: profile.target_audience }
    : undefined;

  // 6. Build prompt
  const prompt = buildIdeasPrompt(context, recentPosts, creatorProfile, trendingTopics);

  // 7. Call OpenAI
  const result = await chatCompletion({
    model: MODEL,
    messages: [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ],
    maxTokens: 16384,
    responseFormat: { type: "json_object" },
  });

  // 8. Parse and validate
  let ideas: ContentIdea[];
  try {
    const arr = extractJsonPayload(result.content, { arrayKeys: ["ideas"] });
    ideas = ideasArraySchema.parse(arr);
  } catch (parseError) {
    const rawPreview = result.content.length > 500
      ? result.content.slice(0, 500) + "..."
      : result.content;

    console.error("[ideation] Parse/validation failed", {
      error: parseError instanceof Error ? parseError.message : String(parseError),
      rawContentPreview: rawPreview,
      model: result.model,
      tokensOut: result.tokensOut,
      latencyMs: result.latencyMs,
    });

    await insertAiLog({
      userId,
      actionType: "generate_content_ideas",
      model: MODEL,
      promptTemplate: GENERATE_IDEAS_TEMPLATE,
      promptVersion: Number(GENERATE_IDEAS_VERSION),
      contextPayload: { totalPosts: context.creatorSummary.totalPosts, trendingTopicsCount: trendingTopics.length },
      fullPrompt: prompt.fullPrompt,
      response: result.content,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      latencyMs: result.latencyMs,
      wasUsed: false,
    });

    throw new Error("Failed to parse AI ideas response", { cause: parseError });
  }

  // 9. Log success
  await insertAiLog({
    userId,
    actionType: "generate_content_ideas",
    model: MODEL,
    promptTemplate: GENERATE_IDEAS_TEMPLATE,
    promptVersion: Number(GENERATE_IDEAS_VERSION),
    contextPayload: { totalPosts: context.creatorSummary.totalPosts, trendingTopicsCount: trendingTopics.length },
    fullPrompt: prompt.fullPrompt,
    response: result.content,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    latencyMs: result.latencyMs,
    wasUsed: true,
  });

  return ideas;
}
