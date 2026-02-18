import { chatCompletion, extractJsonPayload } from "@/lib/ai/client";
import {
  hashtagSuggestionsArraySchema,
  type HashtagSuggestion,
} from "@/lib/ai/hashtags";
import {
  buildSuggestHashtagsPrompt,
  SUGGEST_HASHTAGS_TEMPLATE,
  SUGGEST_HASHTAGS_VERSION,
  type CreatorProfileContext,
} from "@/lib/ai/prompts";
import { insertAiLog } from "./ai-logs";
import { getCreatorProfile } from "./profiles";

const MODEL = "gpt-4o-mini";

export async function suggestHashtags(
  userId: string,
  content: string,
): Promise<HashtagSuggestion[]> {
  // Fetch creator profile for context
  const profile = await getCreatorProfile(userId);
  const creatorProfile: CreatorProfileContext | undefined = profile
    ? {
        niches: profile.niches ?? [],
        goals: profile.goals ?? [],
        targetAudience: profile.target_audience,
      }
    : undefined;

  // Build prompt
  const prompt = buildSuggestHashtagsPrompt(content, creatorProfile);

  // Call OpenAI
  const result = await chatCompletion({
    model: MODEL,
    messages: [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ],
    maxTokens: 500,
    temperature: 0.3,
    responseFormat: { type: "json_object" },
  });

  // Parse and validate
  let suggestions: HashtagSuggestion[];
  try {
    const arr = extractJsonPayload(result.content, { arrayKeys: ["suggestions", "hashtags", "tags"] });
    suggestions = hashtagSuggestionsArraySchema.parse(arr);
  } catch (parseError) {
    console.error("[hashtags] Parse/validation failed", {
      error: parseError instanceof Error ? parseError.message : String(parseError),
      rawContentPreview: result.content.slice(0, 500),
      model: result.model,
    });

    try {
      await insertAiLog({
        userId,
        actionType: "suggest_hashtags",
        model: MODEL,
        promptTemplate: SUGGEST_HASHTAGS_TEMPLATE,
        promptVersion: Number(SUGGEST_HASHTAGS_VERSION),
        contextPayload: { contentLength: content.length },
        fullPrompt: prompt.fullPrompt,
        response: result.content,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        latencyMs: result.latencyMs,
        wasUsed: false,
      });
    } catch {
      // Don't let logging failure mask the original error
    }

    throw new Error("Failed to parse AI hashtag suggestions", { cause: parseError });
  }

  // Log success
  await insertAiLog({
    userId,
    actionType: "suggest_hashtags",
    model: MODEL,
    promptTemplate: SUGGEST_HASHTAGS_TEMPLATE,
    promptVersion: Number(SUGGEST_HASHTAGS_VERSION),
    contextPayload: { contentLength: content.length },
    fullPrompt: prompt.fullPrompt,
    response: result.content,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    latencyMs: result.latencyMs,
    wasUsed: true,
  });

  return suggestions;
}
