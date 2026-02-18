import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

import OpenAI from "openai";
import {
  getOpenAIClient,
  getDefaultModel,
  isStrictTemperatureModel,
  usesNewTokenParam,
  chatCompletion,
  extractJsonPayload,
} from "./client";

describe("getOpenAIClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "test-key";
  });

  it("returns an OpenAI instance", () => {
    const client = getOpenAIClient();
    expect(client).toBeDefined();
    expect(OpenAI).toHaveBeenCalledWith({ apiKey: "test-key" });
  });

  it("throws when OPENAI_API_KEY is not set", () => {
    delete process.env.OPENAI_API_KEY;
    expect(() => getOpenAIClient()).toThrow("OPENAI_API_KEY");
  });
});

describe("getDefaultModel", () => {
  it("returns gpt-4o-mini", () => {
    expect(getDefaultModel()).toBe("gpt-4o-mini");
  });
});

describe("isStrictTemperatureModel", () => {
  it("returns true for gpt-5", () => {
    expect(isStrictTemperatureModel("gpt-5")).toBe(true);
  });

  it("returns true for o1", () => {
    expect(isStrictTemperatureModel("o1")).toBe(true);
  });

  it("returns true for o1-mini", () => {
    expect(isStrictTemperatureModel("o1-mini")).toBe(true);
  });

  it("returns true for o1-preview", () => {
    expect(isStrictTemperatureModel("o1-preview")).toBe(true);
  });

  it("returns true for o3-mini", () => {
    expect(isStrictTemperatureModel("o3-mini")).toBe(true);
  });

  it("returns true for prefix match like gpt-5-turbo", () => {
    expect(isStrictTemperatureModel("gpt-5-turbo")).toBe(true);
  });

  it("returns false for gpt-4o-mini", () => {
    expect(isStrictTemperatureModel("gpt-4o-mini")).toBe(false);
  });

  it("returns false for gpt-4o", () => {
    expect(isStrictTemperatureModel("gpt-4o")).toBe(false);
  });
});

describe("usesNewTokenParam", () => {
  it("returns true for gpt-5", () => {
    expect(usesNewTokenParam("gpt-5")).toBe(true);
  });

  it("returns true for o1", () => {
    expect(usesNewTokenParam("o1")).toBe(true);
  });

  it("returns true for o3-mini", () => {
    expect(usesNewTokenParam("o3-mini")).toBe(true);
  });

  it("returns false for gpt-4o-mini", () => {
    expect(usesNewTokenParam("gpt-4o-mini")).toBe(false);
  });

  it("returns true for prefix match like o1-2024-12-17", () => {
    expect(usesNewTokenParam("o1-2024-12-17")).toBe(true);
  });
});

describe("chatCompletion", () => {
  let mockCreate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "test-key";
    mockCreate = vi.fn().mockResolvedValue({
      choices: [{ message: { content: '{"result":"ok"}' } }],
      usage: { prompt_tokens: 100, completion_tokens: 50 },
    });
    vi.mocked(OpenAI).mockImplementation(
      () =>
        ({
          chat: { completions: { create: mockCreate } },
        }) as never,
    );
  });

  it("sends correct params for gpt-4o-mini", async () => {
    await chatCompletion({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "hello" }],
      maxTokens: 500,
      temperature: 0.5,
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-4o-mini",
        temperature: 0.5,
        max_tokens: 500,
        messages: [{ role: "user", content: "hello" }],
      }),
    );
    // Should NOT have max_completion_tokens
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs).not.toHaveProperty("max_completion_tokens");
  });

  it("sends max_completion_tokens and omits temperature for gpt-5", async () => {
    await chatCompletion({
      model: "gpt-5",
      messages: [{ role: "user", content: "hello" }],
      maxTokens: 2500,
      temperature: 0.7,
    });

    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.model).toBe("gpt-5");
    expect(callArgs.max_completion_tokens).toBe(2500);
    expect(callArgs).not.toHaveProperty("temperature");
    expect(callArgs).not.toHaveProperty("max_tokens");
  });

  it("sends max_completion_tokens and omits temperature for o1", async () => {
    await chatCompletion({
      model: "o1",
      messages: [{ role: "user", content: "hello" }],
      maxTokens: 1000,
      temperature: 0.3,
    });

    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.max_completion_tokens).toBe(1000);
    expect(callArgs).not.toHaveProperty("temperature");
    expect(callArgs).not.toHaveProperty("max_tokens");
  });

  it("returns content, token counts, latency, and model", async () => {
    const result = await chatCompletion({
      messages: [{ role: "user", content: "hi" }],
    });

    expect(result.content).toBe('{"result":"ok"}');
    expect(result.tokensIn).toBe(100);
    expect(result.tokensOut).toBe(50);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.model).toBe("gpt-4o-mini");
  });

  it("uses default model when not specified", async () => {
    await chatCompletion({
      messages: [{ role: "user", content: "hi" }],
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: "gpt-4o-mini" }),
    );
  });

  it("passes response_format when specified", async () => {
    await chatCompletion({
      messages: [{ role: "user", content: "hi" }],
      responseFormat: { type: "json_object" },
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        response_format: { type: "json_object" },
      }),
    );
  });

  it("throws when AI returns empty choices", async () => {
    mockCreate.mockResolvedValue({
      choices: [],
      usage: { prompt_tokens: 10, completion_tokens: 0 },
    });

    await expect(
      chatCompletion({ messages: [{ role: "user", content: "hi" }] }),
    ).rejects.toThrow(/AI returned empty response/);
  });

  it("throws when AI returns null content", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: null }, finish_reason: "length" }],
      usage: { prompt_tokens: 100, completion_tokens: 50 },
    });

    await expect(
      chatCompletion({ messages: [{ role: "user", content: "hi" }] }),
    ).rejects.toThrow(/AI returned empty response.*finishReason=length/);
  });

  it("handles missing usage gracefully", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "ok" } }],
    });

    const result = await chatCompletion({
      messages: [{ role: "user", content: "hi" }],
    });

    expect(result.tokensIn).toBe(0);
    expect(result.tokensOut).toBe(0);
  });

  it("omits maxTokens param entirely when not specified", async () => {
    await chatCompletion({
      messages: [{ role: "user", content: "hi" }],
    });

    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs).not.toHaveProperty("max_tokens");
    expect(callArgs).not.toHaveProperty("max_completion_tokens");
  });
});

describe("extractJsonPayload", () => {
  it("returns parsed array directly", () => {
    const result = extractJsonPayload('[{"a":1},{"a":2}]');
    expect(result).toEqual([{ a: 1 }, { a: 2 }]);
  });

  it("extracts array using first matching arrayKey", () => {
    const raw = JSON.stringify({ ideas: [{ a: 1 }] });
    const result = extractJsonPayload(raw, { arrayKeys: ["ideas"] });
    expect(result).toEqual([{ a: 1 }]);
  });

  it("tries arrayKeys in order and uses first match", () => {
    const raw = JSON.stringify({ topics: [{ t: 1 }], ideas: [{ i: 1 }] });
    const result = extractJsonPayload(raw, {
      arrayKeys: ["ideas", "topics"],
    });
    expect(result).toEqual([{ i: 1 }]);
  });

  it("falls back to scanning for first array value in object", () => {
    const raw = JSON.stringify({ data: [{ x: 1 }] });
    const result = extractJsonPayload(raw, {
      arrayKeys: ["results"],
    });
    expect(result).toEqual([{ x: 1 }]);
  });

  it("returns flat object directly when no arrayKeys", () => {
    const raw = JSON.stringify({ overall_assessment: "Good", score: 8 });
    const result = extractJsonPayload(raw);
    expect(result).toEqual({ overall_assessment: "Good", score: 8 });
  });

  it("returns flat object when arrayKeys specified but no arrays found", () => {
    const raw = JSON.stringify({ assessment: "Good" });
    const result = extractJsonPayload(raw, { arrayKeys: ["ideas"] });
    expect(result).toEqual({ assessment: "Good" });
  });

  it("returns full object when no arrayKeys specified (even if it contains arrays)", () => {
    const raw = JSON.stringify({ overall: "Good", items: [1, 2, 3] });
    const result = extractJsonPayload(raw);
    expect(result).toEqual({ overall: "Good", items: [1, 2, 3] });
  });

  it("throws on invalid JSON with truncated preview", () => {
    expect(() => extractJsonPayload("not json at all")).toThrow(
      /Failed to parse JSON/,
    );
  });

  it("throws on empty string", () => {
    expect(() => extractJsonPayload("")).toThrow(/Failed to parse JSON/);
  });

  it("includes truncated raw in error for long content", () => {
    const longStr = "x".repeat(600);
    try {
      extractJsonPayload(longStr);
      expect.fail("should throw");
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg.length).toBeLessThan(600);
      expect(msg).toContain("...");
    }
  });

  it("handles nested JSON object with array at known key", () => {
    const raw = JSON.stringify({
      suggestions: [
        { tag: "ai", relevance: "high" },
        { tag: "ml", relevance: "medium" },
      ],
    });
    const result = extractJsonPayload(raw, {
      arrayKeys: ["suggestions", "hashtags", "tags"],
    });
    expect(result).toEqual([
      { tag: "ai", relevance: "high" },
      { tag: "ml", relevance: "medium" },
    ]);
  });

  it("handles wrapper object with array under unknown key", () => {
    const raw = JSON.stringify({
      unknownKey: [{ id: 1 }, { id: 2 }],
    });
    const result = extractJsonPayload(raw, { arrayKeys: ["items"] });
    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
  });
});
