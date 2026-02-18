import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/ai/client", async () => {
  const actual = await vi.importActual("@/lib/ai/client");
  return { ...actual, chatCompletion: vi.fn() };
});

import { chatCompletion } from "@/lib/ai/client";
import { generateStarterIdeas } from "./starter-ideas";

function mockChatCompletion(content: string) {
  vi.mocked(chatCompletion).mockResolvedValue({
    content,
    tokensIn: 100,
    tokensOut: 200,
    latencyMs: 50,
    model: "gpt-4o-mini",
  });
}

describe("generateStarterIdeas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates ideas based on profile data with arrays", async () => {
    const mockIdeas = [
      { idea: "Share your origin story", hook: "I didn't plan to..." },
      { idea: "A mistake that taught you", hook: "Last year..." },
      { idea: "Your contrarian take", hook: "Unpopular opinion..." },
    ];

    mockChatCompletion(JSON.stringify({ ideas: mockIdeas }));

    const result = await generateStarterIdeas({
      niches: ["tech_software", "marketing"],
      goals: ["build_authority", "grow_audience"],
      target_audience: "Early-stage SaaS founders",
    });

    expect(result).toHaveLength(3);
    expect(result[0].idea).toBe("Share your origin story");

    // Verify the prompt contains joined niches/goals
    const callArgs = vi.mocked(chatCompletion).mock.calls[0][0];
    const userPrompt = callArgs.messages[1].content;
    expect(userPrompt).toContain("tech_software, marketing");
    expect(userPrompt).toContain("build_authority, grow_audience");
  });

  it("works with single niche and goal", async () => {
    mockChatCompletion(JSON.stringify({ ideas: [{ idea: "Test", hook: "Hook" }] }));

    const result = await generateStarterIdeas({
      niches: ["tech_software"],
      goals: ["build_authority"],
      target_audience: "Developers",
    });

    expect(result).toHaveLength(1);
    const callArgs = vi.mocked(chatCompletion).mock.calls[0][0];
    const userPrompt = callArgs.messages[1].content;
    expect(userPrompt).toContain("tech_software");
  });

  it("returns empty array when AI fails", async () => {
    vi.mocked(chatCompletion).mockRejectedValue(new Error("API error"));

    const result = await generateStarterIdeas({
      niches: ["tech_software"],
      goals: ["build_authority"],
      target_audience: "SaaS founders",
    });

    expect(result).toEqual([]);
  });

  it("returns empty array when AI returns unparseable content", async () => {
    mockChatCompletion("not json");

    const result = await generateStarterIdeas({
      niches: ["marketing"],
      goals: ["grow_audience"],
      target_audience: "Marketers",
    });

    expect(result).toEqual([]);
  });
});
