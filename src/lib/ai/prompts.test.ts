import { describe, it, expect } from "vitest";
import {
  buildClassifyPrompt,
  CLASSIFY_POST_VERSION,
  CLASSIFY_POST_TEMPLATE,
  GENERATE_INSIGHTS_TEMPLATE,
  GENERATE_INSIGHTS_VERSION,
  buildInsightsPrompt,
  GENERATE_IDEAS_TEMPLATE,
  GENERATE_IDEAS_VERSION,
  buildIdeasPrompt,
  IMPROVE_CONTENT_TEMPLATE,
  IMPROVE_CONTENT_VERSION,
  buildImprovePrompt,
  buildExperimentsPrompt,
  formatCreatorProfile,
  type CreatorProfileContext,
} from "./prompts";
import { INTENTS, CONTENT_TYPES } from "./taxonomy";
import type { InsightContext } from "@/lib/services/aggregation";

describe("prompt constants", () => {
  it("exports a version string", () => {
    expect(CLASSIFY_POST_VERSION).toBe("1.0");
  });

  it("exports template name", () => {
    expect(CLASSIFY_POST_TEMPLATE).toBe("classify_post");
  });
});

describe("buildClassifyPrompt", () => {
  const result = buildClassifyPrompt("How to build a SaaS in 2024 — a thread on the 5 things I learned launching my first product.");

  it("returns system and user messages", () => {
    expect(result).toHaveProperty("system");
    expect(result).toHaveProperty("user");
    expect(typeof result.system).toBe("string");
    expect(typeof result.user).toBe("string");
  });

  it("system message includes all intent categories", () => {
    for (const intent of INTENTS) {
      expect(result.system).toContain(intent);
    }
  });

  it("system message includes all content types", () => {
    for (const type of CONTENT_TYPES) {
      expect(result.system).toContain(type);
    }
  });

  it("system message instructs JSON-only response", () => {
    expect(result.system).toMatch(/json/i);
  });

  it("system message includes example classifications", () => {
    // Should have at least 2 examples
    expect(result.system).toContain("Example");
  });

  it("user message contains the post body", () => {
    expect(result.user).toContain("How to build a SaaS in 2024");
  });

  it("returns the full prompt as a single string", () => {
    expect(result).toHaveProperty("fullPrompt");
    expect(result.fullPrompt).toContain(result.system);
    expect(result.fullPrompt).toContain(result.user);
  });
});

describe("insights prompt constants", () => {
  it("exports GENERATE_INSIGHTS_TEMPLATE", () => {
    expect(GENERATE_INSIGHTS_TEMPLATE).toBe("generate_insights");
  });

  it("exports GENERATE_INSIGHTS_VERSION", () => {
    expect(GENERATE_INSIGHTS_VERSION).toBe("1.0");
  });
});

describe("buildInsightsPrompt", () => {
  const context: InsightContext = {
    creatorSummary: {
      totalPosts: 25,
      postsWithMetrics: 20,
      platforms: ["twitter"],
      earliestPost: "2024-01-01T00:00:00Z",
      latestPost: "2024-06-01T00:00:00Z",
    },
    byIntent: {
      educate: { avgImpressions: 2400, avgEngagement: 60, avgEngagementRate: 0.042, count: 10 },
      engage: { avgImpressions: 1800, avgEngagement: 45, avgEngagementRate: 0.025, count: 8 },
      promote: { avgImpressions: 800, avgEngagement: 15, avgEngagementRate: 0.019, count: 7 },
    },
    byTopic: {
      ai: { avgImpressions: 3000, avgEngagement: 80, avgEngagementRate: 0.05, count: 12 },
      saas: { avgImpressions: 1500, avgEngagement: 30, avgEngagementRate: 0.02, count: 8 },
    },
    byContentType: {
      single: { avgImpressions: 1200, avgEngagement: 30, avgEngagementRate: 0.025, count: 15 },
      thread: { avgImpressions: 3500, avgEngagement: 90, avgEngagementRate: 0.055, count: 10 },
    },
    recentTrend: {
      currentPeriod: { postCount: 12, avgImpressions: 2000, avgEngagement: 50, avgEngagementRate: 0.035 },
      previousPeriod: { postCount: 13, avgImpressions: 1800, avgEngagement: 45, avgEngagementRate: 0.03 },
    },
    outliers: {
      top: [
        { id: "p1", body: "Top post about AI", intent: "educate", topics: ["ai"], impressions: 8000, engagement: 200, engagementRate: 0.08 },
      ],
      bottom: [
        { id: "p2", body: "Low post about promo", intent: "promote", topics: ["saas"], impressions: 200, engagement: 3, engagementRate: 0.015 },
      ],
    },
    postingPattern: {
      totalDays: 150,
      postsPerWeek: 1.17,
    },
  };

  const result = buildInsightsPrompt(context);

  it("returns system and user messages", () => {
    expect(result).toHaveProperty("system");
    expect(result).toHaveProperty("user");
    expect(typeof result.system).toBe("string");
    expect(typeof result.user).toBe("string");
  });

  it("system message describes the AI role", () => {
    expect(result.system).toContain("growth analyst");
  });

  it("system message instructs JSON output", () => {
    expect(result.system).toMatch(/json/i);
  });

  it("system message includes insight type categories", () => {
    expect(result.system).toContain("performance_pattern");
    expect(result.system).toContain("consistency_pattern");
    expect(result.system).toContain("opportunity");
    expect(result.system).toContain("anomaly");
  });

  it("system message includes confidence levels", () => {
    expect(result.system).toContain("high");
    expect(result.system).toContain("medium");
    expect(result.system).toContain("low");
  });

  it("user message includes creator summary", () => {
    expect(result.user).toContain("25");
    expect(result.user).toContain("twitter");
  });

  it("user message includes performance by intent", () => {
    expect(result.user).toContain("educate");
    expect(result.user).toContain("2400");
  });

  it("user message includes performance by topic", () => {
    expect(result.user).toContain("ai");
    expect(result.user).toContain("3000");
  });

  it("user message includes outliers", () => {
    expect(result.user).toContain("Top post about AI");
  });

  it("user message includes posting pattern", () => {
    expect(result.user).toContain("1.17");
  });

  it("returns fullPrompt combining system and user", () => {
    expect(result.fullPrompt).toContain(result.system);
    expect(result.fullPrompt).toContain(result.user);
  });
});

describe("ideas prompt constants", () => {
  it("exports GENERATE_IDEAS_TEMPLATE", () => {
    expect(GENERATE_IDEAS_TEMPLATE).toBe("generate_content_ideas");
  });

  it("exports GENERATE_IDEAS_VERSION", () => {
    expect(GENERATE_IDEAS_VERSION).toBe("5.0");
  });
});

describe("buildIdeasPrompt", () => {
  const context: InsightContext = {
    creatorSummary: {
      totalPosts: 30,
      postsWithMetrics: 25,
      platforms: ["twitter"],
      earliestPost: "2024-01-01T00:00:00Z",
      latestPost: "2024-06-01T00:00:00Z",
    },
    byIntent: {
      educate: { avgImpressions: 2400, avgEngagement: 60, avgEngagementRate: 0.042, count: 10 },
      engage: { avgImpressions: 1800, avgEngagement: 45, avgEngagementRate: 0.025, count: 8 },
    },
    byTopic: {
      ai: { avgImpressions: 3000, avgEngagement: 80, avgEngagementRate: 0.05, count: 12 },
    },
    byContentType: {
      thread: { avgImpressions: 3500, avgEngagement: 90, avgEngagementRate: 0.055, count: 10 },
    },
    recentTrend: {
      currentPeriod: { postCount: 12, avgImpressions: 2000, avgEngagement: 50, avgEngagementRate: 0.035 },
      previousPeriod: { postCount: 13, avgImpressions: 1800, avgEngagement: 45, avgEngagementRate: 0.03 },
    },
    outliers: {
      top: [
        { id: "p1", body: "Top post about AI", intent: "educate", topics: ["ai"], impressions: 8000, engagement: 200, engagementRate: 0.08 },
      ],
      bottom: [],
    },
    postingPattern: { totalDays: 150, postsPerWeek: 1.4 },
  };

  const recentPosts = [
    "Just launched my new AI tool for developers",
    "Thread: 5 lessons from building SaaS",
    "What's your favorite devtool?",
  ];

  const result = buildIdeasPrompt(context, recentPosts);

  it("returns system and user messages", () => {
    expect(result).toHaveProperty("system");
    expect(result).toHaveProperty("user");
    expect(typeof result.system).toBe("string");
    expect(typeof result.user).toBe("string");
  });

  it("system message describes ghostwriter role", () => {
    expect(result.system).toContain("ghostwriter");
  });

  it("system prompt emphasizes human voice and threads", () => {
    expect(result.system).toContain("thread");
    expect(result.system).toMatch(/human/i);
  });

  it("system prompt includes good/bad examples to calibrate output", () => {
    expect(result.system).toContain("BAD headline");
    expect(result.system).toContain("GOOD headline");
  });

  it("system prompt bans corporate speak words", () => {
    expect(result.system).toContain("BANNED words");
  });

  it("system message instructs JSON output", () => {
    expect(result.system).toMatch(/json/i);
  });

  it("system message includes all content formats including thread", () => {
    for (const type of ["single", "thread", "reply", "quote"]) {
      expect(result.system).toContain(type);
    }
  });

  it("system message includes all valid intents", () => {
    for (const intent of INTENTS) {
      expect(result.system).toContain(intent);
    }
  });

  it("user message includes performance data", () => {
    expect(result.user).toContain("educate");
    expect(result.user).toContain("2400");
  });

  it("user message includes top performing posts", () => {
    expect(result.user).toContain("Top post about AI");
  });

  it("user message includes recent posts to avoid repetition", () => {
    expect(result.user).toContain("Just launched my new AI tool");
    expect(result.user).toContain("Thread: 5 lessons from building SaaS");
  });

  it("returns fullPrompt combining system and user", () => {
    expect(result.fullPrompt).toContain(result.system);
    expect(result.fullPrompt).toContain(result.user);
  });

  it("works with empty recent posts", () => {
    const r = buildIdeasPrompt(context, []);
    expect(r.user).toMatch(/no recent posts/i);
  });

  it("includes trending topics section when provided", () => {
    const trendingTopics = [
      { topic: "AI agents in production", description: "Companies deploying agents", relevance: "high" as const },
      { topic: "Vibe coding", description: "AI-generated code debate", relevance: "medium" as const },
    ];
    const r = buildIdeasPrompt(context, recentPosts, undefined, trendingTopics);
    expect(r.user).toContain("Trending Topics");
    expect(r.user).toContain("AI agents in production");
    expect(r.user).toContain("Vibe coding");
  });

  it("does not include trending section when no topics provided", () => {
    const r = buildIdeasPrompt(context, recentPosts);
    expect(r.user).not.toContain("Trending Topics");
  });

  it("does not include trending section when topics array is empty", () => {
    const r = buildIdeasPrompt(context, recentPosts, undefined, []);
    expect(r.user).not.toContain("Trending Topics");
  });

  it("system prompt includes trending blending instruction", () => {
    const r = buildIdeasPrompt(context, recentPosts);
    expect(r.system).toContain("trending");
  });
});

describe("improve prompt constants", () => {
  it("exports IMPROVE_CONTENT_TEMPLATE", () => {
    expect(IMPROVE_CONTENT_TEMPLATE).toBe("improve_content");
  });

  it("exports IMPROVE_CONTENT_VERSION", () => {
    expect(IMPROVE_CONTENT_VERSION).toBe("1.0");
  });
});

describe("buildImprovePrompt", () => {
  const content = "Here's how I built my SaaS from scratch. It took me 6 months.";
  const topPosts = [
    "I grew my SaaS to $10K MRR. Here's the playbook:",
    "Thread: 5 things I wish I knew before launching",
  ];

  const result = buildImprovePrompt(content, topPosts);

  it("returns system and user messages", () => {
    expect(result).toHaveProperty("system");
    expect(result).toHaveProperty("user");
  });

  it("system message describes editor role", () => {
    expect(result.system).toContain("editor");
  });

  it("system message instructs JSON output", () => {
    expect(result.system).toMatch(/json/i);
  });

  it("system message lists improvement types", () => {
    expect(result.system).toContain("hook");
    expect(result.system).toContain("clarity");
    expect(result.system).toContain("engagement");
  });

  it("user message includes the draft content", () => {
    expect(result.user).toContain("Here's how I built my SaaS");
  });

  it("user message includes top performing posts as style reference", () => {
    expect(result.user).toContain("$10K MRR");
    expect(result.user).toContain("5 things I wish I knew");
  });

  it("returns fullPrompt combining system and user", () => {
    expect(result.fullPrompt).toContain(result.system);
    expect(result.fullPrompt).toContain(result.user);
  });

  it("works with empty top posts", () => {
    const r = buildImprovePrompt(content, []);
    expect(r.user).toMatch(/no previous posts/i);
  });
});

describe("formatCreatorProfile", () => {
  const profile: CreatorProfileContext = {
    niches: ["tech_software", "marketing"],
    goals: ["build_authority", "grow_audience"],
    targetAudience: "Early-stage SaaS founders",
  };

  it("includes niches with human-readable labels", () => {
    const result = formatCreatorProfile(profile);
    expect(result).toContain("Tech / Software");
    expect(result).toContain("Marketing");
  });

  it("includes goals with human-readable labels", () => {
    const result = formatCreatorProfile(profile);
    expect(result).toContain("Build authority");
    expect(result).toContain("Grow audience");
  });

  it("includes target audience", () => {
    const result = formatCreatorProfile(profile);
    expect(result).toContain("Early-stage SaaS founders");
  });

  it("has Creator Profile heading", () => {
    const result = formatCreatorProfile(profile);
    expect(result).toContain("## Creator Profile");
  });

  it("handles custom niche values gracefully", () => {
    const result = formatCreatorProfile({
      niches: ["Quantum Computing"],
      goals: ["build_authority"],
      targetAudience: null,
    });
    expect(result).toContain("Quantum Computing");
  });

  it("omits target audience when null", () => {
    const result = formatCreatorProfile({
      niches: ["tech_software"],
      goals: ["build_authority"],
      targetAudience: null,
    });
    expect(result).not.toContain("Target audience");
  });

  it("handles null/undefined niches and goals gracefully", () => {
    const result = formatCreatorProfile({
      niches: null as unknown as string[],
      goals: undefined as unknown as string[],
      targetAudience: "SaaS founders",
    });
    expect(result).toContain("Target audience: SaaS founders");
    expect(result).not.toContain("Niches");
    expect(result).not.toContain("Goals");
  });

  it("returns empty string when all fields are empty/null", () => {
    const result = formatCreatorProfile({
      niches: null as unknown as string[],
      goals: null as unknown as string[],
      targetAudience: null,
    });
    expect(result).toBe("");
  });
});

describe("prompt builders with creator profile", () => {
  const profile: CreatorProfileContext = {
    niches: ["tech_software"],
    goals: ["build_authority"],
    targetAudience: "SaaS founders",
  };

  const insightContext: InsightContext = {
    creatorSummary: {
      totalPosts: 25,
      postsWithMetrics: 20,
      platforms: ["twitter"],
      earliestPost: "2024-01-01T00:00:00Z",
      latestPost: "2024-06-01T00:00:00Z",
    },
    byIntent: {
      educate: { avgImpressions: 2400, avgEngagement: 60, avgEngagementRate: 0.042, count: 10 },
    },
    byTopic: {
      ai: { avgImpressions: 3000, avgEngagement: 80, avgEngagementRate: 0.05, count: 12 },
    },
    byContentType: {
      single: { avgImpressions: 1200, avgEngagement: 30, avgEngagementRate: 0.025, count: 15 },
    },
    recentTrend: {
      currentPeriod: { postCount: 12, avgImpressions: 2000, avgEngagement: 50, avgEngagementRate: 0.035 },
      previousPeriod: { postCount: 13, avgImpressions: 1800, avgEngagement: 45, avgEngagementRate: 0.03 },
    },
    outliers: {
      top: [],
      bottom: [],
    },
    postingPattern: { totalDays: 150, postsPerWeek: 1.17 },
  };

  it("buildInsightsPrompt includes profile in user message", () => {
    const result = buildInsightsPrompt(insightContext, profile);
    expect(result.user).toContain("Creator Profile");
    expect(result.user).toContain("Tech / Software");
  });

  it("buildInsightsPrompt works without profile", () => {
    const result = buildInsightsPrompt(insightContext);
    expect(result.user).not.toContain("Creator Profile");
  });

  it("buildInsightsPrompt system prompt mentions profile tailoring", () => {
    const result = buildInsightsPrompt(insightContext, profile);
    expect(result.system).toContain("Creator Profile");
  });

  it("buildIdeasPrompt includes profile in user message", () => {
    const result = buildIdeasPrompt(insightContext, [], profile);
    expect(result.user).toContain("Creator Profile");
    expect(result.user).toContain("Build authority");
  });

  it("buildIdeasPrompt works without profile", () => {
    const result = buildIdeasPrompt(insightContext, []);
    expect(result.user).not.toContain("Creator Profile");
  });

  it("buildImprovePrompt includes profile in user message", () => {
    const result = buildImprovePrompt("Some draft content", [], profile);
    expect(result.user).toContain("Creator Profile");
    expect(result.user).toContain("SaaS founders");
  });

  it("buildImprovePrompt works without profile", () => {
    const result = buildImprovePrompt("Some draft content", []);
    expect(result.user).not.toContain("Creator Profile");
  });

  it("buildExperimentsPrompt includes profile in user message", () => {
    const result = buildExperimentsPrompt(insightContext, profile);
    expect(result.user).toContain("Creator Profile");
    expect(result.user).toContain("Tech / Software");
  });

  it("buildExperimentsPrompt works without profile", () => {
    const result = buildExperimentsPrompt(insightContext);
    expect(result.user).not.toContain("Creator Profile");
  });
});
