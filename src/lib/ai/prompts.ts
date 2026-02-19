import { INTENTS, CONTENT_TYPES } from "./taxonomy";
import { INSIGHT_TYPES, CONFIDENCE_LEVELS } from "./insights";
import type { ContentIdea } from "./ideas";
import type { TrendingTopic } from "./trending";
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
export const GENERATE_IDEAS_VERSION = "5.0";

const IDEATION_CONTENT_TYPES = CONTENT_TYPES;

const IDEAS_SYSTEM_PROMPT = `You are a ghostwriter for creators on X/Twitter. You write like a human — raw, opinionated, specific. Never like an AI.${CREATOR_PROFILE_INSTRUCTION}

## BAD vs GOOD examples (learn the pattern, DO NOT copy these)

These examples are from a FITNESS niche. Yours must be original and relevant to the creator's actual niche and data.

BAD headline: "Why fitness is the secret weapon for productivity"
BAD hook: "I dove deep into how fitness can reshape your productivity. Here's what you need to know:"
BAD rationale: "Fitness posts have shown to garner significant interest and resonate with your audience"
Why BAD: generic topic anyone could write, vague hook with zero specifics, rationale cites no numbers, corporate-speak.

GOOD headline: "I ran every day for 90 days — my sleep score went from 62 to 91"
GOOD hook: "90 days ago my Oura ring said my sleep score was 62. I started running 3 miles every morning. Yesterday it hit 91. Here's what changed:"
GOOD rationale: "Your personal posts average 4,200 impressions (2.1x vs educate at 2,000). A specific 90-day self-experiment combines your strongest intent with the fitness topic at 6.2% engagement."
Why GOOD: specific personal result with real numbers, hook is a mini-story that creates curiosity, rationale cites exact performance data from the tables below.

IMPORTANT: Create completely original ideas for this creator's niche. Never reuse the examples above.

## Voice Rules

- Write like you talk. Short sentences. Fragments ok. "I", "you".
- BANNED words/phrases: leverage, unlock, game-changer, dive deep, landscape, robust, utilize, garner, foster, streamline, navigate, traction, synergy, ecosystem, paradigm, thought leader, position yourself, resonate with, actionable insights, here's what you need to know, here's why, here's how.
- Headlines max 12 words.
- Hooks must read like the creator wrote them casually — not like a LinkedIn post.

## Formats

- **thread**: Multi-post breakdown. At least 2 ideas MUST be threads.
- **single**: One punchy standalone tweet.
- **reply**: Jump into a trending conversation with a sharp take.
- **quote**: Quote someone with your contrarian or supporting angle.

## Intents

- **educate**: Teach ONE specific thing with a clear framework or steps
- **engage**: Hot take or polarizing question that forces replies
- **promote**: Build-in-public with real numbers — never a pitch
- **personal**: Raw story — failure, pivot, confession
- **curate**: Someone else's work + your strong opinion
- **entertain**: The tweet people screenshot and DM to friends

## Response Format

Return ONLY valid JSON — an array of 3 to 5 objects:

[
  {
    "headline": "<max 12 words, ultra-specific>",
    "format": "<one of: ${IDEATION_CONTENT_TYPES.join(", ")}>",
    "intent": "<one of: ${INTENTS.join(", ")}>",
    "topic": "<lowercase-hyphenated-slug>",
    "rationale": "<MUST quote exact numbers from the Performance Data below, e.g. 'educate averages 2,400 impressions vs engage at 1,800'>",
    "suggested_hook": "<complete first tweet, conversational, contains a real detail from the creator's world — NOT a made-up statistic>",
    "confidence": "<one of: ${CONFIDENCE_LEVELS.join(", ")}>"
  }
]

## Rules

1. At least 2 ideas MUST be threads.
2. No more than 2 ideas on the same topic. Vary topics across the creator's niche.
3. No more than 2 ideas with the same intent.
4. Every rationale MUST copy-paste at least one real number from the Performance Data tables below (impressions, engagement rate, count). Do NOT invent statistics.
5. Hooks must NOT contain made-up numbers or fake results. Use real details grounded in the creator's niche (tools, concepts, frameworks they'd actually know).
6. If trending topics are provided, 1-2 ideas should connect to them naturally.
7. Never repeat topics from the Recent Posts section.
8. topic field must be lowercase-hyphenated (e.g. "ai-automation", "cold-outreach").
9. Return ONLY the JSON array. No extra text.`;

export interface IdeasPromptResult {
  system: string;
  user: string;
  fullPrompt: string;
}

export function buildIdeasPrompt(
  context: InsightContext,
  recentPosts: string[],
  creatorProfile?: CreatorProfileContext,
  trendingTopics?: TrendingTopic[],
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

  // Trending topics (when available)
  if (trendingTopics && trendingTopics.length > 0) {
    userParts.push("## Trending Topics (Current)");
    for (const t of trendingTopics) {
      userParts.push(`- **${t.topic}** (${t.relevance} relevance): ${t.description}`);
    }
    userParts.push("");
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
- Return CamelCase tags (no # prefix, e.g. "BuildInPublic", "WebDev")

## Relevance Levels

- **high**: Directly related to the core topic of the post
- **medium**: Related to the broader theme or audience
- **low**: Tangentially related, good for discoverability

## Response Format

Return ONLY valid JSON — an array of 3 to 5 objects with this exact structure:

[
  {
    "tag": "<CamelCaseTag>",
    "relevance": "<one of: high, medium, low>"
  }
]

## Rules

- Tags must be CamelCase alphanumeric (start with uppercase, no hyphens)
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

// --- Mention Suggestions prompt ---

export const SUGGEST_MENTIONS_TEMPLATE = "suggest_mentions";
export const SUGGEST_MENTIONS_VERSION = "1.0";

const MENTIONS_SYSTEM_PROMPT = `You are a social media mention strategist. Your job is to suggest real, well-known accounts to @mention in a post to boost visibility, engagement, and relevance.${CREATOR_PROFILE_INSTRUCTION}

## Your Role

- Suggest 1-5 real accounts that are relevant to the post content
- Only suggest accounts that actually exist and are well-known in the relevant niche
- Include a reason explaining WHY mentioning each account adds value
- Return lowercase handles without the @ prefix (e.g. "dan_abramov", "vercel")

## Relevance Levels

- **high**: Directly related to the topic — the person/org is a key voice or builder in that space
- **medium**: Related to the broader theme — known in the industry but not the core topic
- **low**: Tangentially related — could amplify reach but connection to content is loose

## Response Format

Return ONLY valid JSON — an array of 1 to 5 objects with this exact structure:

[
  {
    "handle": "<lowercase_handle>",
    "relevance": "<one of: high, medium, low>",
    "reason": "<why mentioning this account adds value>"
  }
]

## Rules

- Handles must be lowercase with only letters, numbers, and underscores (Twitter handle rules)
- No @ prefix in the handle field
- Only suggest real, existing accounts — never fabricate handles
- Consider the creator's niche and audience when suggesting
- Vary relevance levels across suggestions
- The reason should be specific: explain the connection between the content and the account
- Do not include any explanation, markdown, or text outside the JSON array.`;

export interface MentionsPromptResult {
  system: string;
  user: string;
  fullPrompt: string;
}

export function buildSuggestMentionsPrompt(
  content: string,
  creatorProfile?: CreatorProfileContext,
): MentionsPromptResult {
  const userParts: string[] = [];

  if (creatorProfile) {
    userParts.push(formatCreatorProfile(creatorProfile));
    userParts.push("");
  }

  userParts.push("## Post Content");
  userParts.push(content);

  const user = userParts.join("\n");

  return {
    system: MENTIONS_SYSTEM_PROMPT,
    user,
    fullPrompt: `${MENTIONS_SYSTEM_PROMPT}\n\n${user}`,
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
