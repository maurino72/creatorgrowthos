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

vi.mock("./ai-logs", () => ({
  insertAiLog: vi.fn().mockResolvedValue({ id: "log-1" }),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { insertAiLog } from "./ai-logs";
import OpenAI from "openai";
import { improveContent } from "./improvement";

const validImprovement = {
  overall_assessment: "Strong educational post with room for a better hook",
  improvements: [
    {
      type: "hook",
      suggestion: "Lead with the outcome",
      example: "I grew to $10K MRR. Here's the playbook:",
    },
    {
      type: "engagement",
      suggestion: "End with a question",
      example: "What's the hardest part for you?",
    },
  ],
  improved_version: "I grew to $10K MRR. Here's the playbook:\n\n...",
};

function mockOpenAIResponse(content: string) {
  const mockCreate = vi.fn().mockResolvedValue({
    choices: [{ message: { content } }],
    usage: { prompt_tokens: 400, completion_tokens: 250 },
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
        { id: "e1", posts: { body: "Top performing post about AI" } },
        { id: "e2", posts: { body: "Another great thread on SaaS" } },
      ],
      error: null,
    }),
  };
  vi.mocked(createAdminClient).mockReturnValue(chain as never);
  return chain;
}

describe("improveContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "test-key";
  });

  it("returns validated improvement from AI", async () => {
    mockSupabase();
    mockOpenAIResponse(JSON.stringify(validImprovement));

    const result = await improveContent("user-1", "Here's how I built my SaaS");
    expect(result.overall_assessment).toContain("Strong educational");
    expect(result.improvements).toHaveLength(2);
    expect(result.improved_version).toContain("$10K MRR");
  });

  it("logs the AI call on success", async () => {
    mockSupabase();
    mockOpenAIResponse(JSON.stringify(validImprovement));

    await improveContent("user-1", "Some draft");
    expect(insertAiLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        actionType: "improve_content",
        wasUsed: true,
      }),
    );
  });

  it("logs and rethrows on invalid AI response", async () => {
    mockSupabase();
    mockOpenAIResponse("not json");

    await expect(
      improveContent("user-1", "Some draft"),
    ).rejects.toThrow(/failed to parse/i);
    expect(insertAiLog).toHaveBeenCalledWith(
      expect.objectContaining({ wasUsed: false }),
    );
  });

  it("works when no top posts exist", async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnValue({ data: [], error: null }),
    };
    vi.mocked(createAdminClient).mockReturnValue(chain as never);
    mockOpenAIResponse(JSON.stringify(validImprovement));

    const result = await improveContent("user-1", "Some draft");
    expect(result.improvements).toHaveLength(2);
  });
});
