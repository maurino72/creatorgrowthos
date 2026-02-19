import { chatCompletion, extractJsonPayload } from "@/lib/ai/client";
import {
  mentionSuggestionsArraySchema,
  type MentionSuggestion,
} from "@/lib/ai/mentions";
import {
  buildSuggestMentionsPrompt,
  SUGGEST_MENTIONS_TEMPLATE,
  SUGGEST_MENTIONS_VERSION,
  type CreatorProfileContext,
} from "@/lib/ai/prompts";
import { insertAiLog } from "./ai-logs";
import { getCreatorProfile } from "./profiles";

const MODEL = "gpt-4o-mini";

export async function suggestMentions(
  userId: string,
  content: string,
): Promise<MentionSuggestion[]> {
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
  const prompt = buildSuggestMentionsPrompt(content, creatorProfile);

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
  let suggestions: MentionSuggestion[];
  try {
    const arr = extractJsonPayload(result.content, { arrayKeys: ["suggestions", "mentions", "accounts"] });
    suggestions = mentionSuggestionsArraySchema.parse(arr);
  } catch (parseError) {
    console.error("[mentions] Parse/validation failed", {
      error: parseError instanceof Error ? parseError.message : String(parseError),
      rawContentPreview: result.content.slice(0, 500),
      model: result.model,
    });

    try {
      await insertAiLog({
        userId,
        actionType: "suggest_mentions",
        model: MODEL,
        promptTemplate: SUGGEST_MENTIONS_TEMPLATE,
        promptVersion: Number(SUGGEST_MENTIONS_VERSION),
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

    throw new Error("Failed to parse AI mention suggestions", { cause: parseError });
  }

  // Log success
  await insertAiLog({
    userId,
    actionType: "suggest_mentions",
    model: MODEL,
    promptTemplate: SUGGEST_MENTIONS_TEMPLATE,
    promptVersion: Number(SUGGEST_MENTIONS_VERSION),
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
