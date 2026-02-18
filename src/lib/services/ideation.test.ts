import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("openai", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
    })),
  };
});

vi.mock("./aggregation", () => ({
  getAggregatedData: vi.fn(),
}));

vi.mock("./ai-logs", () => ({
  insertAiLog: vi.fn().mockResolvedValue({ id: "log-1" }),
}));

vi.mock("./profiles", () => ({
  getCreatorProfile: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { getAggregatedData } from "./aggregation";
import { insertAiLog } from "./ai-logs";
import { getCreatorProfile } from "./profiles";
import OpenAI from "openai";
import type { InsightContext } from "./aggregation";
import { generateContentIdeas, MIN_IDEATION_POSTS } from "./ideation";

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

function mockOpenAIResponse(content: string) {
  const mockCreate = vi.fn().mockResolvedValue({
    choices: [{ message: { content } }],
    usage: { prompt_tokens: 500, completion_tokens: 300 },
  });
  vi.mocked(OpenAI).mockImplementation(() => ({
    chat: {
      completions: { create: mockCreate },
    },
  }) as never);
  return mockCreate;
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
    process.env.OPENAI_API_KEY = "test-key";
  });

  it("returns validated ideas from AI", async () => {
    vi.mocked(getAggregatedData).mockResolvedValue(baseContext);
    mockSupabase();
    mockOpenAIResponse(JSON.stringify(validIdeas));

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
    mockOpenAIResponse(JSON.stringify(validIdeas));

    await generateContentIdeas("user-1");
    expect(insertAiLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        actionType: "generate_content_ideas",
        wasUsed: true,
      }),
    );
  });

  it("logs and rethrows on invalid AI response", async () => {
    vi.mocked(getAggregatedData).mockResolvedValue(baseContext);
    mockSupabase();
    mockOpenAIResponse("not json");

    await expect(generateContentIdeas("user-1")).rejects.toThrow(
      /failed to parse/i,
    );
    expect(insertAiLog).toHaveBeenCalledWith(
      expect.objectContaining({
        wasUsed: false,
      }),
    );
  });

  it("handles AI response wrapped in { ideas: [...] }", async () => {
    vi.mocked(getAggregatedData).mockResolvedValue(baseContext);
    mockSupabase();
    mockOpenAIResponse(JSON.stringify({ ideas: validIdeas }));

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
    const mockCreate = mockOpenAIResponse(JSON.stringify(validIdeas));

    await generateContentIdeas("user-1");

    expect(getCreatorProfile).toHaveBeenCalledWith("user-1");
    const userMsg = mockCreate.mock.calls[0][0].messages[1].content;
    expect(userMsg).toContain("Creator Profile");
  });

  it("works when no creator profile exists", async () => {
    vi.mocked(getAggregatedData).mockResolvedValue(baseContext);
    vi.mocked(getCreatorProfile).mockResolvedValue(null);
    mockSupabase();
    mockOpenAIResponse(JSON.stringify(validIdeas));

    const result = await generateContentIdeas("user-1");
    expect(result).toHaveLength(3);
  });

  it("filters out thread-format ideas from AI response", async () => {
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
    mockOpenAIResponse(JSON.stringify(ideasWithThread));

    const result = await generateContentIdeas("user-1");
    expect(result.every((idea) => idea.format !== "thread")).toBe(true);
    expect(result).toHaveLength(3);
  });
});
