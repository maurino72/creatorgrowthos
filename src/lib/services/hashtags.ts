import OpenAI from "openai";
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

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }
  return new OpenAI({ apiKey });
}

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
  const openai = getOpenAIClient();
  const startTime = Date.now();

  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.3,
    max_tokens: 500,
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

  // Parse and validate
  let suggestions: HashtagSuggestion[];
  try {
    const parsed = JSON.parse(rawContent);
    let arr: unknown;
    if (Array.isArray(parsed)) {
      arr = parsed;
    } else if (typeof parsed === "object" && parsed !== null) {
      // Find the first array value in the response object (handles any wrapper key)
      arr = Object.values(parsed).find((v) => Array.isArray(v));
    }
    suggestions = hashtagSuggestionsArraySchema.parse(arr);
  } catch {
    try {
      await insertAiLog({
        userId,
        actionType: "suggest_hashtags",
        model: MODEL,
        promptTemplate: SUGGEST_HASHTAGS_TEMPLATE,
        promptVersion: Number(SUGGEST_HASHTAGS_VERSION),
        contextPayload: { contentLength: content.length },
        fullPrompt: prompt.fullPrompt,
        response: rawContent,
        tokensIn,
        tokensOut,
        latencyMs,
        wasUsed: false,
      });
    } catch {
      // Don't let logging failure mask the original error
    }

    throw new Error("Failed to parse AI hashtag suggestions");
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
    response: rawContent,
    tokensIn,
    tokensOut,
    latencyMs,
    wasUsed: true,
  });

  return suggestions;
}
