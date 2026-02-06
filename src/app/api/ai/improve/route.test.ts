import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/services/improvement", () => ({
  improveContent: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { improveContent } from "@/lib/services/improvement";

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

describe("POST /api/ai/improve", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const { POST } = await importRoute();

    const request = new Request("http://localhost/api/ai/improve", {
      method: "POST",
      body: JSON.stringify({ content: "Some draft" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it("returns improvement result on success", async () => {
    mockAuth({ id: "user-1" });
    const mockResult = {
      overall_assessment: "Good draft with room for improvement",
      improvements: [
        { type: "hook", suggestion: "Lead with outcome", example: "I grew..." },
      ],
      improved_version: "Better version here",
    };
    vi.mocked(improveContent).mockResolvedValue(mockResult);

    const { POST } = await importRoute();
    const request = new Request("http://localhost/api/ai/improve", {
      method: "POST",
      body: JSON.stringify({ content: "My draft" }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.result).toEqual(mockResult);
  });

  it("returns 400 when content is empty", async () => {
    mockAuth({ id: "user-1" });
    const { POST } = await importRoute();

    const request = new Request("http://localhost/api/ai/improve", {
      method: "POST",
      body: JSON.stringify({ content: "" }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("content");
  });

  it("returns 400 when content is missing", async () => {
    mockAuth({ id: "user-1" });
    const { POST } = await importRoute();

    const request = new Request("http://localhost/api/ai/improve", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("returns 500 on unexpected error", async () => {
    mockAuth({ id: "user-1" });
    vi.mocked(improveContent).mockRejectedValue(new Error("AI failed"));

    const { POST } = await importRoute();
    const request = new Request("http://localhost/api/ai/improve", {
      method: "POST",
      body: JSON.stringify({ content: "My draft" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(500);
  });
});
