import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateStarterIdeas } from "./starter-ideas";
import OpenAI from "openai";

vi.mock("openai");

describe("generateStarterIdeas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("OPENAI_API_KEY", "test-key");
  });

  it("generates ideas based on profile data", async () => {
    const mockIdeas = [
      { idea: "Share your origin story", hook: "I didn't plan to..." },
      { idea: "A mistake that taught you", hook: "Last year..." },
      { idea: "Your contrarian take", hook: "Unpopular opinion..." },
    ];

    vi.mocked(OpenAI).mockImplementation(
      () =>
        ({
          chat: {
            completions: {
              create: vi.fn().mockResolvedValue({
                choices: [
                  {
                    message: {
                      content: JSON.stringify({ ideas: mockIdeas }),
                    },
                  },
                ],
                usage: { prompt_tokens: 100, completion_tokens: 200 },
              }),
            },
          },
        }) as never,
    );

    const result = await generateStarterIdeas({
      primary_niche: "tech_software",
      primary_goal: "build_authority",
      target_audience: "Early-stage SaaS founders",
    });

    expect(result).toHaveLength(3);
    expect(result[0].idea).toBe("Share your origin story");
  });

  it("returns empty array when AI fails", async () => {
    vi.mocked(OpenAI).mockImplementation(
      () =>
        ({
          chat: {
            completions: {
              create: vi.fn().mockRejectedValue(new Error("API error")),
            },
          },
        }) as never,
    );

    const result = await generateStarterIdeas({
      primary_niche: "tech_software",
      primary_goal: "build_authority",
      target_audience: "SaaS founders",
    });

    expect(result).toEqual([]);
  });

  it("returns empty array when AI returns unparseable content", async () => {
    vi.mocked(OpenAI).mockImplementation(
      () =>
        ({
          chat: {
            completions: {
              create: vi.fn().mockResolvedValue({
                choices: [{ message: { content: "not json" } }],
                usage: { prompt_tokens: 0, completion_tokens: 0 },
              }),
            },
          },
        }) as never,
    );

    const result = await generateStarterIdeas({
      primary_niche: "marketing",
      primary_goal: "grow_audience",
      target_audience: "Marketers",
    });

    expect(result).toEqual([]);
  });
});
