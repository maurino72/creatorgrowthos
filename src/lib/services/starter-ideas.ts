import { chatCompletion, extractJsonPayload } from "@/lib/ai/client";

const MODEL = "gpt-4o-mini";

export interface StarterIdea {
  idea: string;
  hook: string;
}

export interface StarterProfileInput {
  niches: string[];
  goals: string[];
  target_audience: string;
}

export async function generateStarterIdeas(
  profile: StarterProfileInput,
): Promise<StarterIdea[]> {
  try {
    const systemPrompt = `You are a content strategist helping creators get started. Generate 10 content ideas as a "Starter Pack" for a new creator.

Each idea should include:
- "idea": A short title (under 50 chars)
- "hook": An opening line/hook they can use (under 140 chars)

Return JSON: { "ideas": [...] }`;

    const userPrompt = `Creator profile:
- Niches: ${profile.niches.join(", ")}
- Goals: ${profile.goals.join(", ")}
- Target audience: ${profile.target_audience}

Generate 10 content ideas tailored to this creator. Mix formats: stories, tips, opinions, questions, and lists.`;

    const result = await chatCompletion({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      maxTokens: 1500,
      temperature: 0.8,
      responseFormat: { type: "json_object" },
    });

    const ideas = extractJsonPayload(result.content, { arrayKeys: ["ideas"] });

    if (!Array.isArray(ideas)) return [];
    return ideas as StarterIdea[];
  } catch {
    return [];
  }
}
