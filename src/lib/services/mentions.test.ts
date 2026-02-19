import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/ai/client", async () => {
  const actual = await vi.importActual("@/lib/ai/client");
  return { ...actual, chatCompletion: vi.fn() };
});
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));
vi.mock("./ai-logs", () => ({
  insertAiLog: vi.fn(),
}));
vi.mock("./profiles", () => ({
  getCreatorProfile: vi.fn(),
}));

import { chatCompletion } from "@/lib/ai/client";
import { suggestMentions } from "./mentions";
import { insertAiLog } from "./ai-logs";
import { getCreatorProfile } from "./profiles";

const TEST_USER_ID = "user-123";

function mockChatCompletion(content: string) {
  const mock = vi.mocked(chatCompletion).mockResolvedValue({
    content,
    tokensIn: 100,
    tokensOut: 50,
    latencyMs: 50,
    model: "gpt-4o-mini",
  });
  return mock;
}

describe("suggestMentions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCreatorProfile).mockResolvedValue(null);
  });

  it("returns parsed mention suggestions", async () => {
    const suggestions = [
      { handle: "dan_abramov", relevance: "high", reason: "React core team" },
      { handle: "vercel", relevance: "medium", reason: "Next.js creator" },
      { handle: "rauchg", relevance: "low", reason: "CEO of Vercel" },
    ];
    mockChatCompletion(JSON.stringify(suggestions));

    const result = await suggestMentions(TEST_USER_ID, "Building with React and Next.js");

    expect(result).toEqual(suggestions);
  });

  it("calls OpenAI with temperature 0.3", async () => {
    const suggestions = [
      { handle: "react", relevance: "high", reason: "Official React account" },
    ];
    mockChatCompletion(JSON.stringify(suggestions));

    await suggestMentions(TEST_USER_ID, "Building with React");

    expect(chatCompletion).toHaveBeenCalledWith(
      expect.objectContaining({ temperature: 0.3 }),
    );
  });

  it("includes creator profile when available", async () => {
    const suggestions = [
      { handle: "react", relevance: "high", reason: "Official React account" },
    ];
    mockChatCompletion(JSON.stringify(suggestions));
    vi.mocked(getCreatorProfile).mockResolvedValue({
      id: "cp-1",
      user_id: TEST_USER_ID,
      niches: ["tech"],
      goals: ["grow-audience"],
      target_audience: "Developers",
      created_at: null,
      updated_at: null,
    });

    await suggestMentions(TEST_USER_ID, "Building with React");

    const callArgs = vi.mocked(chatCompletion).mock.calls[0][0];
    const userContent = callArgs.messages[1].content;
    expect(userContent).toContain("Creator Profile");
  });

  it("logs the AI call on success", async () => {
    const suggestions = [
      { handle: "react", relevance: "high", reason: "Official React account" },
    ];
    mockChatCompletion(JSON.stringify(suggestions));

    await suggestMentions(TEST_USER_ID, "Building with React");

    expect(insertAiLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: TEST_USER_ID,
        actionType: "suggest_mentions",
        wasUsed: true,
      }),
    );
  });

  it("handles wrapped response format { suggestions: [...] }", async () => {
    const suggestions = [
      { handle: "dan_abramov", relevance: "high", reason: "React core team" },
    ];
    mockChatCompletion(JSON.stringify({ suggestions }));

    const result = await suggestMentions(TEST_USER_ID, "Building with React");

    expect(result).toEqual(suggestions);
  });

  it("handles wrapped response format { mentions: [...] }", async () => {
    const suggestions = [
      { handle: "vercel", relevance: "high", reason: "Next.js creators" },
    ];
    mockChatCompletion(JSON.stringify({ mentions: suggestions }));

    const result = await suggestMentions(TEST_USER_ID, "Building with Next.js");

    expect(result).toEqual(suggestions);
  });

  it("handles wrapped response format { accounts: [...] }", async () => {
    const suggestions = [
      { handle: "rauchg", relevance: "medium", reason: "Vercel CEO" },
    ];
    mockChatCompletion(JSON.stringify({ accounts: suggestions }));

    const result = await suggestMentions(TEST_USER_ID, "Using Vercel");

    expect(result).toEqual(suggestions);
  });

  it("throws on invalid AI response", async () => {
    mockChatCompletion("invalid json");

    await expect(
      suggestMentions(TEST_USER_ID, "Building with React"),
    ).rejects.toThrow("Failed to parse AI mention suggestions");
  });

  it("logs the failure when parsing fails", async () => {
    mockChatCompletion("invalid json");

    await expect(
      suggestMentions(TEST_USER_ID, "Building with React"),
    ).rejects.toThrow();

    expect(insertAiLog).toHaveBeenCalledWith(
      expect.objectContaining({
        wasUsed: false,
      }),
    );
  });

  it("handles response with only 1 suggestion", async () => {
    const suggestions = [{ handle: "react", relevance: "high", reason: "Core framework" }];
    mockChatCompletion(JSON.stringify({ suggestions }));

    const result = await suggestMentions(TEST_USER_ID, "React");

    expect(result).toEqual(suggestions);
  });

  it("still throws original error when insertAiLog fails in error path", async () => {
    mockChatCompletion("not valid json {{{");
    vi.mocked(insertAiLog).mockRejectedValueOnce(new Error("DB insert failed"));

    await expect(
      suggestMentions(TEST_USER_ID, "Building with React"),
    ).rejects.toThrow("Failed to parse AI mention suggestions");
  });

  it("throws descriptive error when OPENAI_API_KEY is missing", async () => {
    vi.mocked(chatCompletion).mockRejectedValueOnce(
      new Error("OPENAI_API_KEY environment variable is not set"),
    );

    await expect(
      suggestMentions(TEST_USER_ID, "Building with React"),
    ).rejects.toThrow("OPENAI_API_KEY");
  });
});
