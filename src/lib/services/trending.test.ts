import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/ai/client", async () => {
  const actual = await vi.importActual("@/lib/ai/client");
  return { ...actual, chatCompletion: vi.fn() };
});

import { chatCompletion } from "@/lib/ai/client";
import { fetchTrendingTopics, clearTrendingCache } from "./trending";

const validTopics = [
  { topic: "AI agents in production", description: "Companies deploying AI agents", relevance: "high" },
  { topic: "Vibe coding debate", description: "Controversy over AI-generated code", relevance: "medium" },
  { topic: "Open source AI models", description: "Llama 4 and other OSS models", relevance: "low" },
];

function mockChatCompletion(content: string) {
  const mock = vi.mocked(chatCompletion).mockResolvedValue({
    content,
    tokensIn: 100,
    tokensOut: 200,
    latencyMs: 50,
    model: "gpt-4o-mini",
  });
  return mock;
}

describe("fetchTrendingTopics", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    clearTrendingCache();
    process.env = { ...originalEnv };
    process.env.OPENAI_API_KEY = "test-openai-key";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns parsed trending topics from OpenAI", async () => {
    mockChatCompletion(JSON.stringify(validTopics));

    const result = await fetchTrendingTopics(["tech_software"]);
    expect(result).toHaveLength(3);
    expect(result[0].topic).toBe("AI agents in production");
    expect(result[0].relevance).toBe("high");
  });

  it("calls chatCompletion", async () => {
    mockChatCompletion(JSON.stringify(validTopics));

    await fetchTrendingTopics(["tech_software"]);

    expect(chatCompletion).toHaveBeenCalled();
  });

  it("uses gpt-4o-mini model", async () => {
    mockChatCompletion(JSON.stringify(validTopics));

    await fetchTrendingTopics(["tech_software"]);

    expect(chatCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-4o-mini",
      }),
    );
  });

  it("returns [] when no niches provided", async () => {
    const result = await fetchTrendingTopics([]);
    expect(result).toEqual([]);
  });

  it("returns [] when OPENAI_API_KEY is not set", async () => {
    delete process.env.OPENAI_API_KEY;

    const result = await fetchTrendingTopics(["tech_software"]);
    expect(result).toEqual([]);
  });

  it("returns [] when OPENAI_API_KEY is empty string", async () => {
    process.env.OPENAI_API_KEY = "";

    const result = await fetchTrendingTopics(["tech_software"]);
    expect(result).toEqual([]);
  });

  it("returns [] when API call fails", async () => {
    vi.mocked(chatCompletion).mockRejectedValueOnce(new Error("API error"));

    const result = await fetchTrendingTopics(["tech_software"]);
    expect(result).toEqual([]);
  });

  it("returns [] when response cannot be parsed as JSON", async () => {
    mockChatCompletion("not valid json");

    const result = await fetchTrendingTopics(["tech_software"]);
    expect(result).toEqual([]);
  });

  it("returns [] when response fails Zod validation", async () => {
    mockChatCompletion(JSON.stringify([{ bad: "data" }]));

    const result = await fetchTrendingTopics(["tech_software"]);
    expect(result).toEqual([]);
  });

  it("returns cached result on second call with same niches", async () => {
    mockChatCompletion(JSON.stringify(validTopics));

    const result1 = await fetchTrendingTopics(["tech_software"]);
    const result2 = await fetchTrendingTopics(["tech_software"]);

    expect(result1).toEqual(result2);
    expect(chatCompletion).toHaveBeenCalledTimes(1);
  });

  it("uses same cache key regardless of niche order", async () => {
    mockChatCompletion(JSON.stringify(validTopics));

    await fetchTrendingTopics(["tech_software", "marketing"]);
    await fetchTrendingTopics(["marketing", "tech_software"]);

    expect(chatCompletion).toHaveBeenCalledTimes(1);
  });

  it("does not use cache after TTL expires", async () => {
    mockChatCompletion(JSON.stringify(validTopics));

    await fetchTrendingTopics(["tech_software"]);

    // Simulate TTL expiry by clearing cache
    clearTrendingCache();

    await fetchTrendingTopics(["tech_software"]);

    expect(chatCompletion).toHaveBeenCalledTimes(2);
  });

  it("uses different cache entries for different niches", async () => {
    mockChatCompletion(JSON.stringify(validTopics));

    await fetchTrendingTopics(["tech_software"]);
    await fetchTrendingTopics(["marketing"]);

    expect(chatCompletion).toHaveBeenCalledTimes(2);
  });

  it("includes niche labels in prompt", async () => {
    mockChatCompletion(JSON.stringify(validTopics));

    await fetchTrendingTopics(["tech_software", "marketing"]);

    const callArgs = vi.mocked(chatCompletion).mock.calls[0][0];
    const userMsg = callArgs.messages[1].content;
    expect(userMsg).toContain("Tech / Software");
    expect(userMsg).toContain("Marketing");
  });

  it("handles wrapped response { topics: [...] }", async () => {
    mockChatCompletion(JSON.stringify({ topics: validTopics }));

    const result = await fetchTrendingTopics(["tech_software"]);
    expect(result).toHaveLength(3);
  });
});
