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
  insertAiLog: vi.fn(),
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
import {
  generateInsights,
  getInsightsForUser,
  dismissInsight,
  markInsightActedOn,
  getEligibleUsersForInsights,
  InsufficientDataError,
} from "./insights";

const MOCK_CONTEXT: InsightContext = {
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
  },
  byTopic: {
    ai: { avgImpressions: 3000, avgEngagement: 80, avgEngagementRate: 0.05, count: 12 },
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
    top: [{ id: "p1", body: "Top post", intent: "educate", topics: ["ai"], impressions: 8000, engagement: 200, engagementRate: 0.08 }],
    bottom: [{ id: "p2", body: "Low post", intent: "promote", topics: ["saas"], impressions: 200, engagement: 3, engagementRate: 0.015 }],
  },
  postingPattern: { totalDays: 150, postsPerWeek: 1.17 },
};

const MOCK_AI_RESPONSE = JSON.stringify([
  {
    type: "performance_pattern",
    headline: "Educational content is your superpower",
    detail: "Your educational posts average 2,400 impressions vs 1,800 for engagement posts.",
    data_points: [{ metric: "impressions", value: "2,400", comparison: "33% higher than engagement posts" }],
    action: "Consider posting more educational threads",
    confidence: "medium",
  },
  {
    type: "opportunity",
    headline: "Threads outperform single posts",
    detail: "Threads average 3,500 impressions vs 1,200 for single posts.",
    data_points: [{ metric: "impressions", value: "3,500", comparison: "2.9x single posts" }],
    action: "Try converting your best single posts into threads",
    confidence: "medium",
  },
  {
    type: "anomaly",
    headline: "One post broke out",
    detail: "Your top post got 8,000 impressions, 4x your average.",
    data_points: [{ metric: "impressions", value: "8,000", comparison: "4x average" }],
    action: "Analyze what made this post successful and replicate the format",
    confidence: "high",
  },
]);

function mockOpenAIResponse(content: string) {
  const mockCreate = vi.fn().mockResolvedValue({
    choices: [{ message: { content } }],
    usage: { prompt_tokens: 500, completion_tokens: 200 },
  });
  vi.mocked(OpenAI).mockImplementation(() => ({
    chat: {
      completions: { create: mockCreate },
    },
  }) as never);
  return mockCreate;
}

function mockSupabase() {
  const insertResult = { data: null, error: null };
  const selectResult = { data: [], error: null };
  const updateResult = { data: { id: "insight-1", status: "dismissed" }, error: null };

  const chain = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnValue(updateResult),
    range: vi.fn().mockReturnValue(selectResult),
  };

  // Make insert return data with select
  chain.insert = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: { id: "insight-1", type: "performance_pattern", headline: "Test", status: "active" },
        error: null,
      }),
    }),
  });

  // Default order → returns selectResult
  chain.order = vi.fn().mockReturnValue(selectResult);

  vi.mocked(createAdminClient).mockReturnValue(chain as never);
  return chain;
}

describe("generateInsights", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates insights from aggregated data", async () => {
    vi.mocked(getAggregatedData).mockResolvedValue(MOCK_CONTEXT);
    mockOpenAIResponse(MOCK_AI_RESPONSE);
    const chain = mockSupabase();

    const result = await generateInsights("user-1");

    expect(getAggregatedData).toHaveBeenCalledWith("user-1", undefined);
    expect(result).toHaveLength(3);
  });

  it("passes platform to getAggregatedData when provided", async () => {
    vi.mocked(getAggregatedData).mockResolvedValue(MOCK_CONTEXT);
    mockOpenAIResponse(MOCK_AI_RESPONSE);
    mockSupabase();

    await generateInsights("user-1", "twitter");

    expect(getAggregatedData).toHaveBeenCalledWith("user-1", "twitter");
  });

  it("throws InsufficientDataError when less than 20 posts", async () => {
    vi.mocked(getAggregatedData).mockResolvedValue({
      ...MOCK_CONTEXT,
      creatorSummary: { ...MOCK_CONTEXT.creatorSummary, totalPosts: 15 },
    });

    await expect(generateInsights("user-1")).rejects.toThrow(InsufficientDataError);
  });

  it("stores each insight in the database", async () => {
    vi.mocked(getAggregatedData).mockResolvedValue(MOCK_CONTEXT);
    mockOpenAIResponse(MOCK_AI_RESPONSE);
    const chain = mockSupabase();

    await generateInsights("user-1");

    // insert should be called for each insight
    expect(chain.from).toHaveBeenCalledWith("insights");
  });

  it("logs the AI call", async () => {
    vi.mocked(getAggregatedData).mockResolvedValue(MOCK_CONTEXT);
    mockOpenAIResponse(MOCK_AI_RESPONSE);
    mockSupabase();

    await generateInsights("user-1");

    expect(insertAiLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        actionType: "generate_insights",
        model: "gpt-4o-mini",
        wasUsed: true,
      }),
    );
  });

  it("logs failed parse and throws on invalid AI response", async () => {
    vi.mocked(getAggregatedData).mockResolvedValue(MOCK_CONTEXT);
    mockOpenAIResponse("not valid json");
    mockSupabase();

    await expect(generateInsights("user-1")).rejects.toThrow("Failed to parse AI insights response");
    expect(insertAiLog).toHaveBeenCalledWith(
      expect.objectContaining({ wasUsed: false }),
    );
  });

  it("logs failed validation when AI returns wrong schema", async () => {
    vi.mocked(getAggregatedData).mockResolvedValue(MOCK_CONTEXT);
    mockOpenAIResponse(JSON.stringify([{ type: "invalid" }]));
    mockSupabase();

    await expect(generateInsights("user-1")).rejects.toThrow("Failed to parse AI insights response");
    expect(insertAiLog).toHaveBeenCalledWith(
      expect.objectContaining({ wasUsed: false }),
    );
  });

  it("fetches creator profile and passes to prompt builder", async () => {
    vi.mocked(getAggregatedData).mockResolvedValue(MOCK_CONTEXT);
    vi.mocked(getCreatorProfile).mockResolvedValue({
      id: "cp-1",
      user_id: "user-1",
      niches: ["tech_software"],
      goals: ["build_authority"],
      target_audience: "SaaS founders",
      created_at: null,
      updated_at: null,
    });
    const mockCreate = mockOpenAIResponse(MOCK_AI_RESPONSE);
    mockSupabase();

    await generateInsights("user-1");

    expect(getCreatorProfile).toHaveBeenCalledWith("user-1");
    // The prompt should contain creator profile info
    const systemMsg = mockCreate.mock.calls[0][0].messages[0].content;
    expect(systemMsg).toContain("Creator Profile");
  });

  it("works when no creator profile exists", async () => {
    vi.mocked(getAggregatedData).mockResolvedValue(MOCK_CONTEXT);
    vi.mocked(getCreatorProfile).mockResolvedValue(null);
    mockOpenAIResponse(MOCK_AI_RESPONSE);
    mockSupabase();

    const result = await generateInsights("user-1");

    expect(result).toHaveLength(3);
  });
});

describe("getInsightsForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns insights for user", async () => {
    const mockInsights = [
      { id: "i1", type: "performance_pattern", headline: "Test", status: "active" },
    ];
    const chain = mockSupabase();
    chain.order = vi.fn().mockReturnValue({
      limit: vi.fn().mockReturnValue({ data: mockInsights, error: null }),
    });

    const result = await getInsightsForUser("user-1");

    expect(result).toEqual(mockInsights);
    expect(chain.from).toHaveBeenCalledWith("insights");
  });

  it("filters by status", async () => {
    const chain = mockSupabase();
    chain.order = vi.fn().mockReturnValue({
      limit: vi.fn().mockReturnValue({ data: [], error: null }),
    });

    await getInsightsForUser("user-1", { status: "dismissed" });

    expect(chain.eq).toHaveBeenCalledWith("status", "dismissed");
  });

  it("filters by type", async () => {
    const chain = mockSupabase();
    chain.order = vi.fn().mockReturnValue({
      limit: vi.fn().mockReturnValue({ data: [], error: null }),
    });

    await getInsightsForUser("user-1", { type: "anomaly" });

    expect(chain.eq).toHaveBeenCalledWith("type", "anomaly");
  });

  it("throws on database error", async () => {
    const chain = mockSupabase();
    chain.order = vi.fn().mockReturnValue({
      limit: vi.fn().mockReturnValue({ data: null, error: { message: "DB error" } }),
    });

    await expect(getInsightsForUser("user-1")).rejects.toThrow("DB error");
  });
});

describe("dismissInsight", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates insight status to dismissed", async () => {
    const chain = mockSupabase();

    await dismissInsight("user-1", "insight-1");

    expect(chain.from).toHaveBeenCalledWith("insights");
    expect(chain.update).toHaveBeenCalledWith({ status: "dismissed" });
    expect(chain.eq).toHaveBeenCalledWith("id", "insight-1");
    expect(chain.eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("throws on database error", async () => {
    const chain = mockSupabase();
    chain.single = vi.fn().mockReturnValue({ data: null, error: { message: "Not found" } });

    await expect(dismissInsight("user-1", "insight-1")).rejects.toThrow("Not found");
  });
});

describe("markInsightActedOn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates insight status to acted_on", async () => {
    const chain = mockSupabase();

    await markInsightActedOn("user-1", "insight-1");

    expect(chain.update).toHaveBeenCalledWith({ status: "acted_on" });
  });
});

describe("getEligibleUsersForInsights", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns user IDs with 20+ published posts", async () => {
    const chain = mockSupabase();
    // We need to mock the raw query for grouping
    chain.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            data: [
              { user_id: "u1" }, { user_id: "u1" }, { user_id: "u1" },
              // simulate 20+ rows for u1
              ...Array.from({ length: 20 }, () => ({ user_id: "u1" })),
              ...Array.from({ length: 5 }, () => ({ user_id: "u2" })),
            ],
            error: null,
          }),
        }),
      }),
    });

    const result = await getEligibleUsersForInsights();

    // u1 has 23 posts (>= 20), u2 has 5 (< 20)
    expect(result).toContain("u1");
    expect(result).not.toContain("u2");
  });

  it("returns empty array on no data", async () => {
    const chain = mockSupabase();
    chain.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({ data: [], error: null }),
        }),
      }),
    });

    const result = await getEligibleUsersForInsights();

    expect(result).toEqual([]);
  });
});
