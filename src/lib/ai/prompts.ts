import { INTENTS, CONTENT_TYPES } from "./taxonomy";
import { INSIGHT_TYPES, CONFIDENCE_LEVELS } from "./insights";
import type { ContentIdea } from "./ideas";
import { IMPROVEMENT_TYPES } from "./improvement";
import { EXPERIMENT_TYPES } from "./experiments";
import type { InsightContext, PerformanceByCategory, OutlierPost } from "@/lib/services/aggregation";
import { NICHES, GOALS } from "@/lib/validators/onboarding";

export interface CreatorProfileContext {
  niches: string[];
  goals: string[];
  targetAudience: string | null;
}

const NICHE_LABELS: Record<string, string> = Object.fromEntries(
  NICHES.map((n) => [n.value, n.label]),
);

const GOAL_LABELS: Record<string, string> = Object.fromEntries(
  GOALS.map((g) => [g.value, g.label]),
);

export function formatCreatorProfile(profile: CreatorProfileContext): string {
  const niches = profile.niches ?? [];
  const goals = profile.goals ?? [];
  if (niches.length === 0 && goals.length === 0 && !profile.targetAudience) {
    return "";
  }
  const parts: string[] = [];
  parts.push("## Creator Profile");
  if (niches.length > 0) {
    parts.push(`- Niches: ${niches.map((n) => NICHE_LABELS[n] ?? n).join(", ")}`);
  }
  if (goals.length > 0) {
    parts.push(`- Goals: ${goals.map((g) => GOAL_LABELS[g] ?? g).join(", ")}`);
  }
  if (profile.targetAudience) {
    parts.push(`- Target audience: ${profile.targetAudience}`);
  }
  return parts.join("\n");
}

const CREATOR_PROFILE_INSTRUCTION = "\nWhen a Creator Profile section is provided, tailor your analysis to the creator's specific niches, goals, and target audience.";

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

const INSIGHTS_SYSTEM_PROMPT = `You are a growth analyst for content creators. Your job is to analyze a creator's content performance data and generate actionable insights.${CREATOR_PROFILE_INSTRUCTION}

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

export function buildInsightsPrompt(context: InsightContext, creatorProfile?: CreatorProfileContext): InsightsPromptResult {
  const { creatorSummary, byIntent, byTopic, byContentType, recentTrend, outliers, postingPattern } = context;

  const userParts: string[] = [];

  if (creatorProfile) {
    userParts.push(formatCreatorProfile(creatorProfile));
    userParts.push("");
  }

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

// --- Content Ideation prompt ---

export const GENERATE_IDEAS_TEMPLATE = "generate_content_ideas";
export const GENERATE_IDEAS_VERSION = "1.0";

// Thread excluded — not yet supported for creation
const IDEATION_CONTENT_TYPES = CONTENT_TYPES.filter((t) => t !== "thread");

const CONTENT_TYPE_IDEA_DESCRIPTIONS: Record<string, string> = {
  single: "Standard single post (tweet)",
  reply: "Reply to a trending topic or conversation",
  quote: "Quote tweet with your unique take",
};

const INTENT_IDEA_DESCRIPTIONS: Record<string, string> = {
  educate: "Teaching, sharing knowledge — tutorials, how-tos, explanations",
  engage: "Starting conversations — questions, polls, hot takes",
  promote: "Marketing — product launches, feature announcements",
  personal: "Personal stories — reflections, experiences, opinions",
  curate: "Sharing others' content with commentary — recommendations",
  entertain: "Humor, casual content — memes, observations",
};

const IDEAS_SYSTEM_PROMPT = `You are a content strategist with deep knowledge of this creator's audience and performance data. Your job is to suggest content ideas grounded in real data about what works.${CREATOR_PROFILE_INSTRUCTION}

## Your Role

- Suggest 3-5 content ideas based on the creator's performance data
- Each idea should be specific and actionable
- Ground every suggestion in data (what has worked before)
- Vary formats and intents across suggestions
- Avoid repeating recent posts

## Content Formats

${IDEATION_CONTENT_TYPES.map((t) => `- **${t}**: ${CONTENT_TYPE_IDEA_DESCRIPTIONS[t]}`).join("\n")}

## Intent Categories

${INTENTS.map((i) => `- **${i}**: ${INTENT_IDEA_DESCRIPTIONS[i]}`).join("\n")}

## Confidence Levels

- **high**: Strong data support (topic/format has 2x+ better performance)
- **medium**: Moderate data support (1.5x+ better performance)
- **low**: Exploratory suggestion based on limited data

## Response Format

Return ONLY valid JSON — an array of 3 to 5 idea objects with this exact structure:

[
  {
    "headline": "<catchy idea title>",
    "format": "<one of: ${IDEATION_CONTENT_TYPES.join(", ")}>",
    "intent": "<one of: ${INTENTS.join(", ")}>",
    "topic": "<topic-slug>",
    "rationale": "<why this idea, grounded in data>",
    "suggested_hook": "<opening line suggestion>",
    "confidence": "<one of: ${CONFIDENCE_LEVELS.join(", ")}>"
  }
]

## Rules

- Every rationale MUST reference real numbers from the data
- Vary formats and intents — don't suggest all the same format or intent
- Avoid topics the creator posted about recently (listed under Recent Posts)
- Suggest at least one idea in the creator's top-performing format/intent
- Do not include any explanation, markdown, or text outside the JSON array.`;

export interface IdeasPromptResult {
  system: string;
  user: string;
  fullPrompt: string;
}

export function buildIdeasPrompt(
  context: InsightContext,
  recentPosts: string[],
  creatorProfile?: CreatorProfileContext,
): IdeasPromptResult {
  const { creatorSummary, byIntent, byTopic, byContentType, outliers } = context;

  const userParts: string[] = [];

  if (creatorProfile) {
    userParts.push(formatCreatorProfile(creatorProfile));
    userParts.push("");
  }

  // Creator summary
  userParts.push("## Creator Summary");
  userParts.push(`- Total published posts: ${creatorSummary.totalPosts}`);
  userParts.push(`- Platforms: ${creatorSummary.platforms.join(", ")}`);
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

  // Top performers
  if (outliers.top.length > 0) {
    userParts.push("## Top Performing Posts");
    userParts.push(formatOutliers("top", outliers.top));
  }

  // Recent posts (to avoid repetition)
  userParts.push("## Recent Posts (Avoid Repetition)");
  if (recentPosts.length > 0) {
    for (const post of recentPosts) {
      userParts.push(`- "${post}"`);
    }
  } else {
    userParts.push("No recent posts available.");
  }

  const user = userParts.join("\n");

  return {
    system: IDEAS_SYSTEM_PROMPT,
    user,
    fullPrompt: `${IDEAS_SYSTEM_PROMPT}\n\n${user}`,
  };
}

// --- Content Improvement prompt ---

export const IMPROVE_CONTENT_TEMPLATE = "improve_content";
export const IMPROVE_CONTENT_VERSION = "1.0";

const IMPROVEMENT_TYPE_DESCRIPTIONS: Record<string, string> = {
  hook: "Opening line improvement — lead with the outcome or a surprising statement",
  clarity: "Clarity and readability — simplify confusing sentences",
  engagement: "Engagement boosters — add questions, calls-to-action, or controversy",
  length: "Length optimization — trim or expand based on what performs best",
  focus: "Topic focus — narrow to one clear message if too scattered",
};

const IMPROVE_SYSTEM_PROMPT = `You are an editor helping improve social media posts before publishing. You understand what makes content perform well on social platforms.${CREATOR_PROFILE_INSTRUCTION}

## Your Role

- Analyze the draft and suggest specific improvements
- Maintain the creator's authentic voice — don't make it sound generic
- Be concrete: show exactly what to change with examples
- Provide an optional improved version that applies all suggestions

## Improvement Types

${IMPROVEMENT_TYPES.map((t) => `- **${t}**: ${IMPROVEMENT_TYPE_DESCRIPTIONS[t]}`).join("\n")}

## Response Format

Return ONLY valid JSON with this exact structure:

{
  "overall_assessment": "<1-2 sentence summary of the draft's strengths and weaknesses>",
  "improvements": [
    {
      "type": "<one of: ${IMPROVEMENT_TYPES.join(", ")}>",
      "suggestion": "<specific actionable suggestion>",
      "example": "<concrete example of the improvement>"
    }
  ],
  "improved_version": "<optional: full rewritten version applying all suggestions>"
}

## Rules

- Suggest 1-5 improvements, ordered by impact
- Each suggestion must be specific and actionable
- The improved_version MUST NOT exceed 280 characters (this is the platform limit)
- The improved_version should sound natural, not AI-generated
- Reference the creator's style from their top performing posts when available
- Do not include any explanation, markdown, or text outside the JSON object.`;

export interface ImprovePromptResult {
  system: string;
  user: string;
  fullPrompt: string;
}

export function buildImprovePrompt(
  content: string,
  topPosts: string[],
  creatorProfile?: CreatorProfileContext,
): ImprovePromptResult {
  const userParts: string[] = [];

  if (creatorProfile) {
    userParts.push(formatCreatorProfile(creatorProfile));
    userParts.push("");
  }

  userParts.push("## Draft to Improve");
  userParts.push(content);
  userParts.push("");

  userParts.push("## Creator's Top Performing Posts (Style Reference)");
  if (topPosts.length > 0) {
    for (const post of topPosts) {
      userParts.push(`- "${post}"`);
    }
  } else {
    userParts.push("No previous posts available for style reference.");
  }

  const user = userParts.join("\n");

  return {
    system: IMPROVE_SYSTEM_PROMPT,
    user,
    fullPrompt: `${IMPROVE_SYSTEM_PROMPT}\n\n${user}`,
  };
}

// --- Experiment Suggestions prompt ---

export const SUGGEST_EXPERIMENTS_TEMPLATE = "suggest_experiments";
export const SUGGEST_EXPERIMENTS_VERSION = "1.0";

const EXPERIMENT_TYPE_DESCRIPTIONS: Record<string, string> = {
  format_test: "Test the same content in different formats (thread vs single, quote vs reply)",
  topic_test: "Test a new or underexplored topic based on adjacent success signals",
  style_test: "Test a different tone or style (more personal, more data-driven, etc.)",
};

const EXPERIMENTS_SYSTEM_PROMPT = `You are a growth strategist helping content creators run deliberate experiments to learn what works.${CREATOR_PROFILE_INSTRUCTION}

## Your Role

- Suggest 1-3 experiments based on the creator's performance data
- Each experiment should test one specific variable
- Ground every hypothesis in real data
- Focus on experiments that can produce actionable learnings

## Experiment Types

${EXPERIMENT_TYPES.map((t) => `- **${t}**: ${EXPERIMENT_TYPE_DESCRIPTIONS[t]}`).join("\n")}

## Confidence Levels

- **high**: Strong data support for the hypothesis
- **medium**: Moderate data, worth testing
- **low**: Exploratory, limited data

## Response Format

Return ONLY valid JSON — an array of 1 to 3 experiment objects with this exact structure:

[
  {
    "type": "<one of: ${EXPERIMENT_TYPES.join(", ")}>",
    "hypothesis": "<what we expect to learn>",
    "description": "<how to run the experiment>",
    "recommended_action": "<specific next step for the creator>",
    "confidence": "<one of: ${CONFIDENCE_LEVELS.join(", ")}>"
  }
]

## Rules

- Every hypothesis MUST reference real numbers from the data
- Each experiment should test ONE variable only
- Include clear, actionable steps
- Vary experiment types when possible
- Do not include any explanation, markdown, or text outside the JSON array.`;

// --- Hashtag Suggestions prompt ---

export const SUGGEST_HASHTAGS_TEMPLATE = "suggest_hashtags";
export const SUGGEST_HASHTAGS_VERSION = "1.0";

const HASHTAGS_SYSTEM_PROMPT = `You are a social media hashtag strategist. Your job is to suggest specific, niche hashtags that will boost discoverability and engagement for a given post.${CREATOR_PROFILE_INSTRUCTION}

## Your Role

- Suggest 3-5 hashtags that are specific to the content
- Prefer niche hashtags over generic ones (#BuildInPublic > #coding)
- Consider the creator's niche and audience when suggesting
- Return lowercase, hyphenated tags (no # prefix)

## Relevance Levels

- **high**: Directly related to the core topic of the post
- **medium**: Related to the broader theme or audience
- **low**: Tangentially related, good for discoverability

## Response Format

Return ONLY valid JSON — an array of 3 to 5 objects with this exact structure:

[
  {
    "tag": "<lowercase-hyphenated-tag>",
    "relevance": "<one of: high, medium, low>"
  }
]

## Rules

- Tags must be lowercase, alphanumeric with optional hyphens
- No spaces, no # prefix, no special characters
- Prefer specific niche tags over generic ones
- Vary relevance levels across suggestions
- Do not include any explanation, markdown, or text outside the JSON array.`;

export interface HashtagsPromptResult {
  system: string;
  user: string;
  fullPrompt: string;
}

export function buildSuggestHashtagsPrompt(
  content: string,
  creatorProfile?: CreatorProfileContext,
): HashtagsPromptResult {
  const userParts: string[] = [];

  if (creatorProfile) {
    userParts.push(formatCreatorProfile(creatorProfile));
    userParts.push("");
  }

  userParts.push("## Post Content");
  userParts.push(content);

  const user = userParts.join("\n");

  return {
    system: HASHTAGS_SYSTEM_PROMPT,
    user,
    fullPrompt: `${HASHTAGS_SYSTEM_PROMPT}\n\n${user}`,
  };
}

export interface ExperimentsPromptResult {
  system: string;
  user: string;
  fullPrompt: string;
}

export function buildExperimentsPrompt(
  context: InsightContext,
  creatorProfile?: CreatorProfileContext,
): ExperimentsPromptResult {
  const { creatorSummary, byIntent, byTopic, byContentType, recentTrend } = context;

  const userParts: string[] = [];

  if (creatorProfile) {
    userParts.push(formatCreatorProfile(creatorProfile));
    userParts.push("");
  }

  userParts.push("## Creator Summary");
  userParts.push(`- Total published posts: ${creatorSummary.totalPosts}`);
  userParts.push(`- Platforms: ${creatorSummary.platforms.join(", ")}`);
  userParts.push("");

  userParts.push("## Performance by Intent");
  userParts.push(formatCategory("Intent", byIntent));

  userParts.push("## Performance by Topic");
  userParts.push(formatCategory("Topic", byTopic));

  userParts.push("## Performance by Content Type");
  userParts.push(formatCategory("Type", byContentType));

  userParts.push("## Recent Trend");
  const { currentPeriod, previousPeriod } = recentTrend;
  userParts.push(`- Current: ${currentPeriod.postCount} posts, ${Math.round(currentPeriod.avgImpressions)} avg impressions, ${(currentPeriod.avgEngagementRate * 100).toFixed(1)}% rate`);
  userParts.push(`- Previous: ${previousPeriod.postCount} posts, ${Math.round(previousPeriod.avgImpressions)} avg impressions, ${(previousPeriod.avgEngagementRate * 100).toFixed(1)}% rate`);

  const user = userParts.join("\n");

  return {
    system: EXPERIMENTS_SYSTEM_PROMPT,
    user,
    fullPrompt: `${EXPERIMENTS_SYSTEM_PROMPT}\n\n${user}`,
  };
}
