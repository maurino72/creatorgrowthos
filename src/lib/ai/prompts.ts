import { INTENTS, CONTENT_TYPES } from "./taxonomy";

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
