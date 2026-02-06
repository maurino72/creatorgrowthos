import { INTENTS, CONTENT_TYPES } from "./taxonomy";
import { INSIGHT_TYPES, CONFIDENCE_LEVELS } from "./insights";
import type { InsightContext, PerformanceByCategory, OutlierPost } from "@/lib/services/aggregation";

export const CLASSIFY_POST_TEMPLATE = "classify_post";
export const CLASSIFY_POST_VERSION = "1.0";

const INTENT_DESCRIPTIONS: Record<string, string> = {
  educate: "Teaching something, sharing knowledge — how-to threads, explanations, tutorials",
  engage: "Starting conversations, asking questions — polls, hot takes, questions",
  promote: "Marketing something (product, service, content) — launch announcements, links",
  personal: "Sharing personal experiences, thoughts — stories, opinions, reflections",
  curate: "Sharing others' content with commentary — quote tweets, recommendations",
  entertain: "Humor, memes, casual content — jokes, memes, casual observations",
};

const CONTENT_TYPE_DESCRIPTIONS: Record<string, string> = {
  single: "Standard single post",
  thread: "Multi-post thread (first post of thread)",
  reply: "Reply to another post",
  quote: "Quote tweet with commentary",
};

const SYSTEM_PROMPT = `You are a content classifier for social media posts. Your job is to analyze a post and return structured classification data.

## Intent Categories

Classify the post's primary intent:

${INTENTS.map((intent) => `- **${intent}**: ${INTENT_DESCRIPTIONS[intent]}`).join("\n")}

## Content Types

Classify the structural format:

${CONTENT_TYPES.map((type) => `- **${type}**: ${CONTENT_TYPE_DESCRIPTIONS[type]}`).join("\n")}

## Topics

Assign 1-3 topic tags that describe the subject matter. Use lowercase, hyphenated format (e.g., "machine-learning", "building-in-public"). Choose from common categories like: ai, saas, programming, web3, devtools, startup, marketing, sales, hiring, fundraising, building-in-public, lessons-learned, productivity, health, books.

## Examples

Example 1:
Post: "Here's how I grew my SaaS from $0 to $10K MRR in 6 months — a thread on the exact steps I took."
Classification: {"intent": "educate", "content_type": "thread", "topics": ["saas", "startup", "building-in-public"]}

Example 2:
Post: "What's the one tool you can't live without as a developer? Drop it below 👇"
Classification: {"intent": "engage", "content_type": "single", "topics": ["devtools", "programming"]}

Example 3:
Post: "Just launched v2.0 of our AI writing assistant! Check it out: example.com/launch"
Classification: {"intent": "promote", "content_type": "single", "topics": ["ai", "saas"]}

Example 4:
Post: "Failed my third startup today. Here's what 4 years and $200K taught me about building products nobody wants."
Classification: {"intent": "personal", "content_type": "single", "topics": ["startup", "lessons-learned"]}

## Instructions

Return ONLY valid JSON with this exact structure:
{
  "intent": "<one of: ${INTENTS.join(", ")}>",
  "content_type": "<one of: ${CONTENT_TYPES.join(", ")}>",
  "topics": ["<topic1>", "<topic2>"],
  "confidence": {"intent": 0.0-1.0, "content_type": 0.0-1.0}
}

Do not include any explanation, markdown, or text outside the JSON object.`;

export interface ClassifyPromptResult {
  system: string;
  user: string;
  fullPrompt: string;
}

export function buildClassifyPrompt(body: string): ClassifyPromptResult {
  const user = `Classify this post:\n\n${body}`;
  return {
    system: SYSTEM_PROMPT,
    user,
    fullPrompt: `${SYSTEM_PROMPT}\n\n${user}`,
  };
}

// --- Insights prompt ---

export const GENERATE_INSIGHTS_TEMPLATE = "generate_insights";
export const GENERATE_INSIGHTS_VERSION = "1.0";

const INSIGHT_TYPE_DESCRIPTIONS: Record<string, string> = {
  performance_pattern: "Patterns in what content performs best (intent, topic, content type comparisons)",
  consistency_pattern: "Patterns in posting frequency, distribution, and consistency",
  opportunity: "Underutilized strengths or untapped areas suggested by the data",
  anomaly: "Breakout posts, underperformers, or sudden changes in performance",
};

const CONFIDENCE_DESCRIPTIONS: Record<string, string> = {
  high: "50+ posts with clear pattern (>2x difference)",
  medium: "20-50 posts with noticeable pattern (>1.5x difference)",
  low: "Minimum data available, suggestive pattern only",
};

const INSIGHTS_SYSTEM_PROMPT = `You are a growth analyst for content creators. Your job is to analyze a creator's content performance data and generate actionable insights.

## Your Role

- Analyze the provided data about a creator's posts, metrics, and patterns
- Identify 3-5 meaningful, actionable insights grounded in the data
- Be specific: always reference actual numbers from the data
- Be honest: acknowledge when data is limited
- Frame observations, not certainties (correlation ≠ causation)

## Insight Types

${INSIGHT_TYPES.map((t) => `- **${t}**: ${INSIGHT_TYPE_DESCRIPTIONS[t]}`).join("\n")}

## Confidence Levels

${CONFIDENCE_LEVELS.map((c) => `- **${c}**: ${CONFIDENCE_DESCRIPTIONS[c]}`).join("\n")}

## Response Format

Return ONLY valid JSON — an array of 3 to 5 insight objects with this exact structure:

[
  {
    "type": "<one of: ${INSIGHT_TYPES.join(", ")}>",
    "headline": "<short attention-grabbing headline>",
    "detail": "<full explanation with specific numbers>",
    "data_points": [{"metric": "<name>", "value": "<formatted value>", "comparison": "<optional comparison>"}],
    "action": "<clear suggested next step>",
    "confidence": "<one of: ${CONFIDENCE_LEVELS.join(", ")}>"
  }
]

## Rules

- Every insight MUST reference real numbers from the data
- Do NOT invent data or make assumptions beyond what is provided
- Include at least one "action" that the creator can take
- Vary insight types — don't return 5 of the same type
- If data is limited, use "low" confidence and note the small sample size
- Do not include any explanation, markdown, or text outside the JSON array.`;

function formatCategory(label: string, data: Record<string, PerformanceByCategory>): string {
  const entries = Object.entries(data);
  if (entries.length === 0) return `No ${label} data available.\n`;

  const header = `| ${label} | Posts | Avg Impressions | Avg Engagement | Avg Eng. Rate |`;
  const separator = "|---|---|---|---|---|";
  const rows = entries.map(
    ([key, perf]) =>
      `| ${key} | ${perf.count} | ${Math.round(perf.avgImpressions)} | ${Math.round(perf.avgEngagement)} | ${(perf.avgEngagementRate * 100).toFixed(1)}% |`,
  );

  return [header, separator, ...rows].join("\n") + "\n";
}

function formatOutliers(label: string, posts: OutlierPost[]): string {
  if (posts.length === 0) return `No ${label} outliers.\n`;

  return posts
    .map(
      (p) =>
        `- "${p.body}" (${p.impressions} impressions, ${p.engagement} engagement, ${(p.engagementRate * 100).toFixed(1)}% rate, intent: ${p.intent ?? "unclassified"})`,
    )
    .join("\n") + "\n";
}

export interface InsightsPromptResult {
  system: string;
  user: string;
  fullPrompt: string;
}

export function buildInsightsPrompt(context: InsightContext): InsightsPromptResult {
  const { creatorSummary, byIntent, byTopic, byContentType, recentTrend, outliers, postingPattern } = context;

  const userParts: string[] = [];

  // Creator summary
  userParts.push("## Creator Summary");
  userParts.push(`- Total published posts: ${creatorSummary.totalPosts}`);
  userParts.push(`- Posts with metrics: ${creatorSummary.postsWithMetrics}`);
  userParts.push(`- Platforms: ${creatorSummary.platforms.join(", ")}`);
  if (creatorSummary.earliestPost && creatorSummary.latestPost) {
    userParts.push(`- Date range: ${creatorSummary.earliestPost.slice(0, 10)} to ${creatorSummary.latestPost.slice(0, 10)}`);
  }
  userParts.push("");

  // Performance by intent
  userParts.push("## Performance by Intent");
  userParts.push(formatCategory("Intent", byIntent));

  // Performance by topic
  userParts.push("## Performance by Topic");
  userParts.push(formatCategory("Topic", byTopic));

  // Performance by content type
  userParts.push("## Performance by Content Type");
  userParts.push(formatCategory("Type", byContentType));

  // Recent trend
  userParts.push("## Recent Trend (Last 30 Days vs Previous 30 Days)");
  const { currentPeriod, previousPeriod } = recentTrend;
  userParts.push(`- Current period: ${currentPeriod.postCount} posts, avg ${Math.round(currentPeriod.avgImpressions)} impressions, ${(currentPeriod.avgEngagementRate * 100).toFixed(1)}% engagement rate`);
  userParts.push(`- Previous period: ${previousPeriod.postCount} posts, avg ${Math.round(previousPeriod.avgImpressions)} impressions, ${(previousPeriod.avgEngagementRate * 100).toFixed(1)}% engagement rate`);
  userParts.push("");

  // Outliers
  userParts.push("## Top Performers");
  userParts.push(formatOutliers("top", outliers.top));
  userParts.push("## Underperformers");
  userParts.push(formatOutliers("bottom", outliers.bottom));

  // Posting pattern
  userParts.push("## Posting Pattern");
  userParts.push(`- Active for ${postingPattern.totalDays} days`);
  userParts.push(`- Average ${postingPattern.postsPerWeek.toFixed(2)} posts per week`);

  const user = userParts.join("\n");

  return {
    system: INSIGHTS_SYSTEM_PROMPT,
    user,
    fullPrompt: `${INSIGHTS_SYSTEM_PROMPT}\n\n${user}`,
  };
}
