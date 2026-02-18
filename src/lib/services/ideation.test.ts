import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/ai/client", async () => {
  const actual = await vi.importActual("@/lib/ai/client");
  return { ...actual, chatCompletion: vi.fn() };
});

vi.mock("./aggregation", () => ({
  getAggregatedData: vi.fn(),
}));

vi.mock("./ai-logs", () => ({
  insertAiLog: vi.fn().mockResolvedValue({ id: "log-1" }),
}));

vi.mock("./profiles", () => ({
  getCreatorProfile: vi.fn().mockResolvedValue(null),
}));

vi.mock("./trending", () => ({
  fetchTrendingTopics: vi.fn().mockResolvedValue([]),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { chatCompletion } from "@/lib/ai/client";
import { getAggregatedData } from "./aggregation";
import { insertAiLog } from "./ai-logs";
import { getCreatorProfile } from "./profiles";
import { fetchTrendingTopics } from "./trending";
import type { InsightContext } from "./aggregation";
import { generateContentIdeas, MIN_IDEATION_POSTS, clearIdeationCache } from "./ideation";

const baseContext: InsightContext = {
  creatorSummary: {
    totalPosts: 15,
    postsWithMetrics: 12,
    platforms: ["twitter"],
    earliestPost: "2024-01-01T00:00:00Z",
    latestPost: "2024-06-01T00:00:00Z",
  },
  byIntent: {
    educate: { avgImpressions: 2400, avgEngagement: 60, avgEngagementRate: 0.042, count: 10 },
  },
  byTopic: {
    ai: { avgImpressions: 3000, avgEngagement: 80, avgEngagementRate: 0.05, count: 8 },
  },
  byContentType: {
    thread: { avgImpressions: 3500, avgEngagement: 90, avgEngagementRate: 0.055, count: 10 },
  },
  recentTrend: {
    currentPeriod: { postCount: 8, avgImpressions: 2000, avgEngagement: 50, avgEngagementRate: 0.035 },
    previousPeriod: { postCount: 7, avgImpressions: 1800, avgEngagement: 45, avgEngagementRate: 0.03 },
  },
  outliers: { top: [], bottom: [] },
  postingPattern: { totalDays: 90, postsPerWeek: 1.2 },
};

const validIdeas = [
  {
    headline: "Behind-the-scenes of AI tool building",
    format: "single",
    intent: "educate",
    topic: "ai",
    rationale: "Your AI posts on this topic get 3x engagement",
    suggested_hook: "I just built an AI tool. Here's how:",
    confidence: "high",
  },
  {
    headline: "Quick tip on developer productivity",
    format: "single",
    intent: "educate",
    topic: "devtools",
    rationale: "Educational content outperforms other intents",
    suggested_hook: "One trick that saved me 2 hours a day:",
    confidence: "medium",
  },
  {
    headline: "What's your AI hot take?",
    format: "single",
    intent: "engage",
    topic: "ai",
    rationale: "Engagement posts build community",
    suggested_hook: "Controversial opinion: AI will...",
    confidence: "medium",
  },
];

function mockChatCompletion(content: string) {
  const mock = vi.mocked(chatCompletion).mockResolvedValue({
    content,
    tokensIn: 500,
    tokensOut: 300,
    latencyMs: 100,
    model: "gpt-5",
  });
  return mock;
}

function mockSupabase() {
  const chain = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnValue({
      data: [
        { body: "Recent post 1" },
        { body: "Recent post 2" },
      ],
      error: null,
    }),
  };
  vi.mocked(createAdminClient).mockReturnValue(chain as never);
  return chain;
}

describe("generateContentIdeas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearIdeationCache();
  });

  it("returns validated ideas from AI", async () => {
    vi.mocked(getAggregatedData).mockResolvedValue(baseContext);
    mockSupabase();
    mockChatCompletion(JSON.stringify(validIdeas));

    const result = await generateContentIdeas("user-1");
    expect(result).toHaveLength(3);
    expect(result[0].headline).toBe("Behind-the-scenes of AI tool building");
    expect(result[0].format).toBe("single");
  });

  it("throws InsufficientDataError when <MIN_IDEATION_POSTS published posts", async () => {
    vi.mocked(getAggregatedData).mockResolvedValue({
      ...baseContext,
      creatorSummary: { ...baseContext.creatorSummary, totalPosts: 5 },
    });
    mockSupabase();

    await expect(generateContentIdeas("user-1")).rejects.toThrow(
      /insufficient data/i,
    );
  });

  it("exports MIN_IDEATION_POSTS as 10", () => {
    expect(MIN_IDEATION_POSTS).toBe(10);
  });

  it("logs the AI call on success", async () => {
    vi.mocked(getAggregatedData).mockResolvedValue(baseContext);
    mockSupabase();
    mockChatCompletion(JSON.stringify(validIdeas));

    await generateContentIdeas("user-1");
    expect(insertAiLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        actionType: "generate_content_ideas",
        wasUsed: true,
      }),
    );
  });

  it("logs and rethrows on invalid AI response with cause", async () => {
    vi.mocked(getAggregatedData).mockResolvedValue(baseContext);
    mockSupabase();
    mockChatCompletion("not json");

    await expect(generateContentIdeas("user-1")).rejects.toThrow(
      /failed to parse/i,
    );
    expect(insertAiLog).toHaveBeenCalledWith(
      expect.objectContaining({
        wasUsed: false,
      }),
    );
  });

  it("includes cause and raw content preview in error on Zod validation failure", async () => {
    vi.mocked(getAggregatedData).mockResolvedValue(baseContext);
    mockSupabase();
    // Valid JSON but invalid schema (bad format value)
    const badIdeas = [
      { headline: "Test", format: "podcast", intent: "educate", topic: "ai", rationale: "r", suggested_hook: "h", confidence: "high" },
      { headline: "Test2", format: "single", intent: "educate", topic: "ai", rationale: "r", suggested_hook: "h", confidence: "high" },
      { headline: "Test3", format: "single", intent: "educate", topic: "ai", rationale: "r", suggested_hook: "h", confidence: "high" },
    ];
    mockChatCompletion(JSON.stringify(badIdeas));

    try {
      await generateContentIdeas("user-1");
      expect.fail("should throw");
    } catch (err) {
      const error = err as Error;
      expect(error.message).toContain("Failed to parse AI ideas response");
      expect(error.cause).toBeDefined();
    }
  });

  it("handles AI response wrapped in { ideas: [...] }", async () => {
    vi.mocked(getAggregatedData).mockResolvedValue(baseContext);
    mockSupabase();
    mockChatCompletion(JSON.stringify({ ideas: validIdeas }));

    const result = await generateContentIdeas("user-1");
    expect(result).toHaveLength(3);
  });

  it("fetches creator profile and includes in prompt", async () => {
    vi.mocked(getAggregatedData).mockResolvedValue(baseContext);
    vi.mocked(getCreatorProfile).mockResolvedValue({
      id: "cp-1",
      user_id: "user-1",
      niches: ["tech_software"],
      goals: ["grow_audience"],
      target_audience: "Developers",
      created_at: null,
      updated_at: null,
    });
    mockSupabase();
    mockChatCompletion(JSON.stringify(validIdeas));

    await generateContentIdeas("user-1");

    expect(getCreatorProfile).toHaveBeenCalledWith("user-1");
    const callArgs = vi.mocked(chatCompletion).mock.calls[0][0];
    const userMsg = callArgs.messages[1].content;
    expect(userMsg).toContain("Creator Profile");
  });

  it("works when no creator profile exists", async () => {
    vi.mocked(getAggregatedData).mockResolvedValue(baseContext);
    vi.mocked(getCreatorProfile).mockResolvedValue(null);
    mockSupabase();
    mockChatCompletion(JSON.stringify(validIdeas));

    const result = await generateContentIdeas("user-1");
    expect(result).toHaveLength(3);
  });

  it("keeps thread-format ideas in AI response", async () => {
    const ideasWithThread = [
      ...validIdeas,
      {
        headline: "How I built my SaaS — a breakdown",
        format: "thread",
        intent: "educate",
        topic: "saas",
        rationale: "Thread format gets 2x engagement",
        suggested_hook: "Let me walk you through it:",
        confidence: "high",
      },
    ];
    vi.mocked(getAggregatedData).mockResolvedValue(baseContext);
    mockSupabase();
    mockChatCompletion(JSON.stringify(ideasWithThread));

    const result = await generateContentIdeas("user-1");
    expect(result.some((idea) => idea.format === "thread")).toBe(true);
    expect(result).toHaveLength(4);
  });

  it("fetches trending topics when creator has niches", async () => {
    const trendingTopics = [
      { topic: "AI agents", description: "Companies deploying agents", relevance: "high" as const },
    ];
    vi.mocked(getAggregatedData).mockResolvedValue(baseContext);
    vi.mocked(getCreatorProfile).mockResolvedValue({
      id: "cp-1",
      user_id: "user-1",
      niches: ["tech_software"],
      goals: ["grow_audience"],
      target_audience: "Developers",
      created_at: null,
      updated_at: null,
    });
    vi.mocked(fetchTrendingTopics).mockResolvedValue(trendingTopics);
    mockSupabase();
    mockChatCompletion(JSON.stringify(validIdeas));

    await generateContentIdeas("user-1");

    expect(fetchTrendingTopics).toHaveBeenCalledWith(["tech_software"]);
    const callArgs = vi.mocked(chatCompletion).mock.calls[0][0];
    const userMsg = callArgs.messages[1].content;
    expect(userMsg).toContain("Trending Topics");
    expect(userMsg).toContain("AI agents");
  });

  it("skips trending when no creator profile exists", async () => {
    vi.mocked(getAggregatedData).mockResolvedValue(baseContext);
    vi.mocked(getCreatorProfile).mockResolvedValue(null);
    mockSupabase();
    mockChatCompletion(JSON.stringify(validIdeas));

    await generateContentIdeas("user-1");

    expect(fetchTrendingTopics).not.toHaveBeenCalled();
  });

  it("skips trending when creator has empty niches", async () => {
    vi.mocked(getAggregatedData).mockResolvedValue(baseContext);
    vi.mocked(getCreatorProfile).mockResolvedValue({
      id: "cp-1",
      user_id: "user-1",
      niches: [],
      goals: ["grow_audience"],
      target_audience: "Developers",
      created_at: null,
      updated_at: null,
    });
    mockSupabase();
    mockChatCompletion(JSON.stringify(validIdeas));

    await generateContentIdeas("user-1");

    expect(fetchTrendingTopics).not.toHaveBeenCalled();
  });

  it("continues pipeline when trending fetch fails", async () => {
    vi.mocked(getAggregatedData).mockResolvedValue(baseContext);
    vi.mocked(getCreatorProfile).mockResolvedValue({
      id: "cp-1",
      user_id: "user-1",
      niches: ["tech_software"],
      goals: ["grow_audience"],
      target_audience: "Developers",
      created_at: null,
      updated_at: null,
    });
    vi.mocked(fetchTrendingTopics).mockResolvedValue([]);
    mockSupabase();
    mockChatCompletion(JSON.stringify(validIdeas));

    const result = await generateContentIdeas("user-1");
    expect(result).toHaveLength(3);
  });

  it("includes trendingTopicsCount in AI log contextPayload", async () => {
    const trendingTopics = [
      { topic: "AI agents", description: "Companies deploying agents", relevance: "high" as const },
      { topic: "Vibe coding", description: "Coding debate", relevance: "medium" as const },
    ];
    vi.mocked(getAggregatedData).mockResolvedValue(baseContext);
    vi.mocked(getCreatorProfile).mockResolvedValue({
      id: "cp-1",
      user_id: "user-1",
      niches: ["tech_software"],
      goals: ["grow_audience"],
      target_audience: "Developers",
      created_at: null,
      updated_at: null,
    });
    vi.mocked(fetchTrendingTopics).mockResolvedValue(trendingTopics);
    mockSupabase();
    mockChatCompletion(JSON.stringify(validIdeas));

    await generateContentIdeas("user-1");

    expect(insertAiLog).toHaveBeenCalledWith(
      expect.objectContaining({
        contextPayload: expect.objectContaining({
          trendingTopicsCount: 2,
        }),
      }),
    );
  });
});
