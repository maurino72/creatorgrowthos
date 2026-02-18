import { describe, it, expect, vi, beforeEach } from "vitest";
import OpenAI from "openai";

vi.mock("openai");
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));
vi.mock("./ai-logs", () => ({
  insertAiLog: vi.fn(),
}));
vi.mock("./profiles", () => ({
  getCreatorProfile: vi.fn(),
}));

import { suggestHashtags } from "./hashtags";
import { insertAiLog } from "./ai-logs";
import { getCreatorProfile } from "./profiles";

const TEST_USER_ID = "user-123";

function mockOpenAI(response: string) {
  const create = vi.fn().mockResolvedValue({
    choices: [{ message: { content: response } }],
    usage: { prompt_tokens: 100, completion_tokens: 50 },
  });

  vi.mocked(OpenAI).mockImplementation(
    () => ({ chat: { completions: { create } } }) as never,
  );

  return create;
}

describe("suggestHashtags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "test-key";
    vi.mocked(getCreatorProfile).mockResolvedValue(null);
  });

  it("returns parsed hashtag suggestions", async () => {
    const suggestions = [
      { tag: "react", relevance: "high" },
      { tag: "nextjs", relevance: "medium" },
      { tag: "webdev", relevance: "low" },
    ];
    mockOpenAI(JSON.stringify(suggestions));

    const result = await suggestHashtags(TEST_USER_ID, "Building with React and Next.js");

    expect(result).toEqual(suggestions);
  });

  it("calls OpenAI with temperature 0.3", async () => {
    const suggestions = [
      { tag: "react", relevance: "high" },
      { tag: "nextjs", relevance: "medium" },
      { tag: "webdev", relevance: "low" },
    ];
    const create = mockOpenAI(JSON.stringify(suggestions));

    await suggestHashtags(TEST_USER_ID, "Building with React");

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ temperature: 0.3 }),
    );
  });

  it("includes creator profile when available", async () => {
    const suggestions = [
      { tag: "react", relevance: "high" },
      { tag: "nextjs", relevance: "medium" },
      { tag: "webdev", relevance: "low" },
    ];
    const create = mockOpenAI(JSON.stringify(suggestions));
    vi.mocked(getCreatorProfile).mockResolvedValue({
      id: "cp-1",
      user_id: TEST_USER_ID,
      niches: ["tech"],
      goals: ["grow-audience"],
      target_audience: "Developers",
      created_at: null,
      updated_at: null,
    });

    await suggestHashtags(TEST_USER_ID, "Building with React");

    const userContent = create.mock.calls[0][0].messages[1].content;
    expect(userContent).toContain("Creator Profile");
  });

  it("logs the AI call on success", async () => {
    const suggestions = [
      { tag: "react", relevance: "high" },
      { tag: "nextjs", relevance: "medium" },
      { tag: "webdev", relevance: "low" },
    ];
    mockOpenAI(JSON.stringify(suggestions));

    await suggestHashtags(TEST_USER_ID, "Building with React");

    expect(insertAiLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: TEST_USER_ID,
        actionType: "suggest_hashtags",
        wasUsed: true,
      }),
    );
  });

  it("handles wrapped response format { suggestions: [...] }", async () => {
    const suggestions = [
      { tag: "react", relevance: "high" },
      { tag: "nextjs", relevance: "medium" },
      { tag: "webdev", relevance: "low" },
    ];
    mockOpenAI(JSON.stringify({ suggestions }));

    const result = await suggestHashtags(TEST_USER_ID, "Building with React");

    expect(result).toEqual(suggestions);
  });

  it("throws on invalid AI response", async () => {
    mockOpenAI("invalid json");

    await expect(
      suggestHashtags(TEST_USER_ID, "Building with React"),
    ).rejects.toThrow("Failed to parse AI hashtag suggestions");
  });

  it("logs the failure when parsing fails", async () => {
    mockOpenAI("invalid json");

    await expect(
      suggestHashtags(TEST_USER_ID, "Building with React"),
    ).rejects.toThrow();

    expect(insertAiLog).toHaveBeenCalledWith(
      expect.objectContaining({
        wasUsed: false,
      }),
    );
  });

  it("handles wrapped response format { hashtags: [...] }", async () => {
    const suggestions = [
      { tag: "react", relevance: "high" },
      { tag: "nextjs", relevance: "medium" },
      { tag: "webdev", relevance: "low" },
    ];
    mockOpenAI(JSON.stringify({ hashtags: suggestions }));

    const result = await suggestHashtags(TEST_USER_ID, "Building with React");

    expect(result).toEqual(suggestions);
  });

  it("handles wrapped response format { tags: [...] }", async () => {
    const suggestions = [
      { tag: "react", relevance: "high" },
      { tag: "nextjs", relevance: "medium" },
      { tag: "webdev", relevance: "low" },
    ];
    mockOpenAI(JSON.stringify({ tags: suggestions }));

    const result = await suggestHashtags(TEST_USER_ID, "Building with React");

    expect(result).toEqual(suggestions);
  });

  it("handles response with only 1 suggestion", async () => {
    const suggestions = [{ tag: "react", relevance: "high" }];
    mockOpenAI(JSON.stringify({ suggestions }));

    const result = await suggestHashtags(TEST_USER_ID, "React");

    expect(result).toEqual(suggestions);
  });

  it("still throws original error when insertAiLog fails in error path", async () => {
    mockOpenAI("invalid json");
    vi.mocked(insertAiLog).mockRejectedValueOnce(new Error("DB insert failed"));

    await expect(
      suggestHashtags(TEST_USER_ID, "Building with React"),
    ).rejects.toThrow("Failed to parse AI hashtag suggestions");
  });

  it("throws descriptive error when OPENAI_API_KEY is missing", async () => {
    const original = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    await expect(
      suggestHashtags(TEST_USER_ID, "Building with React"),
    ).rejects.toThrow("OPENAI_API_KEY");

    process.env.OPENAI_API_KEY = original;
  });
});
