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
  getCreatorProfile: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { chatCompletion } from "@/lib/ai/client";
import { getAggregatedData } from "./aggregation";
import { insertAiLog } from "./ai-logs";
import { getCreatorProfile } from "./profiles";
import type { InsightContext } from "./aggregation";
import {
  suggestExperiments,
  getExperimentsForUser,
  acceptExperiment,
  dismissExperiment,
  MIN_EXPERIMENT_POSTS,
} from "./experiments";

const baseContext: InsightContext = {
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
    ai: { avgImpressions: 3000, avgEngagement: 80, avgEngagementRate: 0.05, count: 8 },
  },
  byContentType: {
    thread: { avgImpressions: 3500, avgEngagement: 90, avgEngagementRate: 0.055, count: 10 },
    single: { avgImpressions: 1200, avgEngagement: 30, avgEngagementRate: 0.025, count: 15 },
  },
  recentTrend: {
    currentPeriod: { postCount: 12, avgImpressions: 2000, avgEngagement: 50, avgEngagementRate: 0.035 },
    previousPeriod: { postCount: 13, avgImpressions: 1800, avgEngagement: 45, avgEngagementRate: 0.03 },
  },
  outliers: { top: [], bottom: [] },
  postingPattern: { totalDays: 150, postsPerWeek: 1.17 },
};

const validSuggestions = [
  {
    type: "format_test",
    hypothesis: "Threads outperform single posts",
    description: "Post the same insight as both formats",
    recommended_action: "Create a thread next time",
    confidence: "high",
  },
  {
    type: "topic_test",
    hypothesis: "AI topic is underexplored",
    description: "Try posting about AI tools",
    recommended_action: "Write about AI tools",
    confidence: "medium",
  },
];

function mockChatCompletion(content: string) {
  const mock = vi.mocked(chatCompletion).mockResolvedValue({
    content,
    tokensIn: 500,
    tokensOut: 300,
    latencyMs: 100,
    model: "gpt-4o-mini",
  });
  return mock;
}

function mockSupabaseForSuggest() {
  const chain = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnValue({
      data: { id: "exp-1", type: "format_test", status: "suggested" },
      error: null,
    }),
  };
  vi.mocked(createAdminClient).mockReturnValue(chain as never);
  return chain;
}

describe("suggestExperiments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns experiment suggestions from AI", async () => {
    vi.mocked(getAggregatedData).mockResolvedValue(baseContext);
    mockSupabaseForSuggest();
    mockChatCompletion(JSON.stringify(validSuggestions));

    const result = await suggestExperiments("user-1");
    expect(result).toHaveLength(2);
  });

  it("passes platform to getAggregatedData when provided", async () => {
    vi.mocked(getAggregatedData).mockResolvedValue(baseContext);
    mockSupabaseForSuggest();
    mockChatCompletion(JSON.stringify(validSuggestions));

    await suggestExperiments("user-1", "twitter");

    expect(getAggregatedData).toHaveBeenCalledWith("user-1", "twitter");
  });

  it("throws InsufficientDataError when <MIN_EXPERIMENT_POSTS", async () => {
    vi.mocked(getAggregatedData).mockResolvedValue({
      ...baseContext,
      creatorSummary: { ...baseContext.creatorSummary, totalPosts: 10 },
    });

    await expect(suggestExperiments("user-1")).rejects.toThrow(
      /insufficient data/i,
    );
  });

  it("exports MIN_EXPERIMENT_POSTS as 15", () => {
    expect(MIN_EXPERIMENT_POSTS).toBe(15);
  });

  it("logs the AI call", async () => {
    vi.mocked(getAggregatedData).mockResolvedValue(baseContext);
    mockSupabaseForSuggest();
    mockChatCompletion(JSON.stringify(validSuggestions));

    await suggestExperiments("user-1");
    expect(insertAiLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: "suggest_experiments",
        wasUsed: true,
      }),
    );
  });

  it("fetches creator profile and includes in prompt", async () => {
    vi.mocked(getAggregatedData).mockResolvedValue(baseContext);
    vi.mocked(getCreatorProfile).mockResolvedValue({
      id: "cp-1",
      user_id: "user-1",
      niches: ["marketing"],
      goals: ["get_clients"],
      target_audience: "Small businesses",
      created_at: null,
      updated_at: null,
    });
    mockSupabaseForSuggest();
    mockChatCompletion(JSON.stringify(validSuggestions));

    await suggestExperiments("user-1");

    expect(getCreatorProfile).toHaveBeenCalledWith("user-1");
    const callArgs = vi.mocked(chatCompletion).mock.calls[0][0];
    const userMsg = callArgs.messages[1].content;
    expect(userMsg).toContain("Creator Profile");
  });

  it("works when no creator profile exists", async () => {
    vi.mocked(getAggregatedData).mockResolvedValue(baseContext);
    vi.mocked(getCreatorProfile).mockResolvedValue(null);
    mockSupabaseForSuggest();
    mockChatCompletion(JSON.stringify(validSuggestions));

    const result = await suggestExperiments("user-1");
    expect(result).toHaveLength(2);
  });
});

describe("getExperimentsForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns experiments for user", async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnValue({
        data: [
          { id: "exp-1", type: "format_test", status: "suggested" },
        ],
        error: null,
      }),
    };
    vi.mocked(createAdminClient).mockReturnValue(chain as never);

    const result = await getExperimentsForUser("user-1");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("exp-1");
  });

  it("filters by status", async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnValue({ data: [], error: null }),
    };
    vi.mocked(createAdminClient).mockReturnValue(chain as never);

    await getExperimentsForUser("user-1", { status: "accepted" });
    expect(chain.eq).toHaveBeenCalledWith("status", "accepted");
  });
});

describe("acceptExperiment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates experiment status to accepted", async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnValue({
        data: { id: "exp-1", status: "accepted" },
        error: null,
      }),
    };
    vi.mocked(createAdminClient).mockReturnValue(chain as never);

    const result = await acceptExperiment("user-1", "exp-1");
    expect(result.status).toBe("accepted");
  });
});

describe("dismissExperiment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates experiment status to dismissed", async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnValue({
        data: { id: "exp-1", status: "dismissed" },
        error: null,
      }),
    };
    vi.mocked(createAdminClient).mockReturnValue(chain as never);

    const result = await dismissExperiment("user-1", "exp-1");
    expect(result.status).toBe("dismissed");
  });
});
