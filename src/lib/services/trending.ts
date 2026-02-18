import { chatCompletion, extractJsonPayload } from "@/lib/ai/client";
import { trendingTopicsArraySchema, type TrendingTopic } from "@/lib/ai/trending";
import { NICHES } from "@/lib/validators/onboarding";

const MODEL = "gpt-4o-mini";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

const NICHE_LABELS: Record<string, string> = Object.fromEntries(
  NICHES.map((n) => [n.value, n.label]),
);

interface CacheEntry {
  topics: TrendingTopic[];
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

function getCacheKey(niches: string[]): string {
  return [...niches].sort().join(",");
}

export function clearTrendingCache(): void {
  cache.clear();
}

export async function fetchTrendingTopics(niches: string[]): Promise<TrendingTopic[]> {
  if (niches.length === 0) return [];

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return [];

  const cacheKey = getCacheKey(niches);
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.topics;
  }

  try {
    const nicheLabels = niches.map((n) => NICHE_LABELS[n] ?? n).join(", ");

    const result = await chatCompletion({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are a trend analyst for content creators. Return ONLY valid JSON — an object with a "topics" key containing an array of 5-8 trending topics relevant to the given niches. Each topic object must have: "topic" (string, the trending topic name), "description" (string, brief explanation), "relevance" (one of: high, medium, low). Do not include any text outside the JSON object.`,
        },
        {
          role: "user",
          content: `What are the top trending topics and conversations right now in these niches: ${nicheLabels}? Focus on topics that content creators could write about today.`,
        },
      ],
      temperature: 0.7,
      responseFormat: { type: "json_object" },
    });

    const arr = extractJsonPayload(result.content, { arrayKeys: ["topics"] });
    const topics = trendingTopicsArraySchema.parse(arr);

    cache.set(cacheKey, { topics, timestamp: Date.now() });

    return topics;
  } catch {
    return [];
  }
}
