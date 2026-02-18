import OpenAI from "openai";
import type { ChatCompletion } from "openai/resources";

const STRICT_TEMPERATURE_PREFIXES = ["gpt-5", "o1", "o3"];

const NEW_TOKEN_PARAM_PREFIXES = ["gpt-5", "o1", "o3"];

const DEFAULT_MODEL = "gpt-4o-mini";

export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }
  return new OpenAI({ apiKey });
}

export function getDefaultModel(): string {
  return DEFAULT_MODEL;
}

export function isStrictTemperatureModel(model: string): boolean {
  return STRICT_TEMPERATURE_PREFIXES.some((prefix) =>
    model.startsWith(prefix),
  );
}

export function usesNewTokenParam(model: string): boolean {
  return NEW_TOKEN_PARAM_PREFIXES.some((prefix) => model.startsWith(prefix));
}

export interface ChatCompletionOptions {
  model?: string;
  messages: Array<{ role: string; content: string }>;
  maxTokens?: number;
  temperature?: number;
  responseFormat?: { type: string };
}

export interface ChatCompletionResult {
  content: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  model: string;
}

export async function chatCompletion(
  options: ChatCompletionOptions,
): Promise<ChatCompletionResult> {
  const model = options.model ?? DEFAULT_MODEL;
  const client = getOpenAIClient();
  const startTime = Date.now();

  const params: Record<string, unknown> = {
    model,
    messages: options.messages,
  };

  if (options.responseFormat) {
    params.response_format = options.responseFormat;
  }

  if (!isStrictTemperatureModel(model) && options.temperature !== undefined) {
    params.temperature = options.temperature;
  }

  if (options.maxTokens !== undefined) {
    if (usesNewTokenParam(model)) {
      params.max_completion_tokens = options.maxTokens;
    } else {
      params.max_tokens = options.maxTokens;
    }
  }

  console.log("[ai/client] chatCompletion request", {
    model,
    messageCount: options.messages.length,
    hasResponseFormat: !!options.responseFormat,
    paramKeys: Object.keys(params).filter((k) => k !== "messages"),
  });

  const completion = (await client.chat.completions.create(
    params as unknown as Parameters<typeof client.chat.completions.create>[0],
  )) as ChatCompletion;

  const latencyMs = Date.now() - startTime;
  const content = completion.choices[0]?.message?.content ?? "";
  const tokensIn = completion.usage?.prompt_tokens ?? 0;
  const tokensOut = completion.usage?.completion_tokens ?? 0;
  const usageAny = completion.usage as unknown as Record<string, unknown> | undefined;
  const reasoningTokens =
    usageAny?.completion_tokens_details != null
      ? (usageAny.completion_tokens_details as Record<string, number>)?.reasoning_tokens ?? 0
      : 0;
  const finishReason = completion.choices[0]?.finish_reason ?? "unknown";

  console.log("[ai/client] chatCompletion response", {
    model,
    latencyMs,
    tokensIn,
    tokensOut,
    ...(reasoningTokens > 0 && { reasoningTokens }),
    finishReason,
    contentLength: content.length,
    contentPreview: content.slice(0, 200),
  });

  if (!content) {
    throw new Error(
      `AI returned empty response (model=${model}, finishReason=${finishReason}, tokensOut=${tokensOut})`,
    );
  }

  return { content, tokensIn, tokensOut, latencyMs, model };
}

export interface ExtractJsonOptions {
  arrayKeys?: string[];
}

export function extractJsonPayload(
  raw: string,
  options?: ExtractJsonOptions,
): unknown {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (jsonError) {
    const preview = raw.length > 500 ? raw.slice(0, 500) + "..." : raw;
    console.error("[ai/client] extractJsonPayload: JSON.parse failed", {
      rawLength: raw.length,
      rawPreview: preview,
    });
    throw new Error(`Failed to parse JSON response: ${preview}`, { cause: jsonError });
  }

  // If it's already an array, return it
  if (Array.isArray(parsed)) {
    return parsed;
  }

  // If it's an object, try to extract an array
  if (typeof parsed === "object" && parsed !== null) {
    const obj = parsed as Record<string, unknown>;

    // Only attempt array extraction when arrayKeys are specified
    if (options?.arrayKeys) {
      // Try specified arrayKeys in order
      for (const key of options.arrayKeys) {
        if (Array.isArray(obj[key])) {
          return obj[key];
        }
      }

      // Fallback: scan for first array value in any key
      const firstArray = Object.values(obj).find((v) => Array.isArray(v));
      if (firstArray) {
        return firstArray;
      }
    }

    // Return the object itself (for flat object responses or when no arrayKeys)
    return obj;
  }

  return parsed;
}
