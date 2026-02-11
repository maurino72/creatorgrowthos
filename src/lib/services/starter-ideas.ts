import OpenAI from "openai";

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

function getOpenAIClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function generateStarterIdeas(
  profile: StarterProfileInput,
): Promise<StarterIdea[]> {
  try {
    const openai = getOpenAIClient();

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

    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.8,
      max_tokens: 1500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const rawContent = completion.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(rawContent);
    const ideas = Array.isArray(parsed) ? parsed : parsed.ideas;

    if (!Array.isArray(ideas)) return [];
    return ideas as StarterIdea[];
  } catch {
    return [];
  }
}
