import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/services/ideation", () => ({
  generateContentIdeas: vi.fn(),
  InsufficientDataError: class InsufficientDataError extends Error {
    constructor(count: number) {
      super(`Insufficient data: ${count} published posts, minimum 10 required`);
      this.name = "InsufficientDataError";
    }
  },
}));

import { createClient } from "@/lib/supabase/server";
import { generateContentIdeas, InsufficientDataError } from "@/lib/services/ideation";

async function importRoute() {
  const mod = await import("./route");
  return mod;
}

function mockAuth(user: { id: string } | null) {
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
      }),
    },
  } as never);
}

describe("POST /api/ai/ideas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const { POST } = await importRoute();

    const request = new Request("http://localhost/api/ai/ideas", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it("returns generated ideas on success", async () => {
    mockAuth({ id: "user-1" });
    const mockIdeas = [
      { headline: "Idea 1", format: "thread", intent: "educate", topic: "ai", rationale: "Works well", suggested_hook: "Hook 1", confidence: "high" },
      { headline: "Idea 2", format: "single", intent: "engage", topic: "saas", rationale: "Community", suggested_hook: "Hook 2", confidence: "medium" },
      { headline: "Idea 3", format: "quote", intent: "curate", topic: "devtools", rationale: "Sharing", suggested_hook: "Hook 3", confidence: "low" },
    ];
    vi.mocked(generateContentIdeas).mockResolvedValue(mockIdeas);

    const { POST } = await importRoute();
    const request = new Request("http://localhost/api/ai/ideas", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.ideas).toEqual(mockIdeas);
  });

  it("returns 400 when insufficient data", async () => {
    mockAuth({ id: "user-1" });
    vi.mocked(generateContentIdeas).mockRejectedValue(
      new InsufficientDataError(5),
    );

    const { POST } = await importRoute();
    const request = new Request("http://localhost/api/ai/ideas", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("Insufficient data");
  });

  it("returns 500 on unexpected error", async () => {
    mockAuth({ id: "user-1" });
    vi.mocked(generateContentIdeas).mockRejectedValue(new Error("OpenAI down"));

    const { POST } = await importRoute();
    const request = new Request("http://localhost/api/ai/ideas", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const response = await POST(request);

    expect(response.status).toBe(500);
  });
});
