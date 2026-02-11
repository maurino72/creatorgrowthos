import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/services/hashtags", () => ({
  suggestHashtags: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { suggestHashtags } from "@/lib/services/hashtags";
import { POST } from "./route";

const TEST_USER_ID = "user-123";

function mockAuth(userId: string | null) {
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userId ? { id: userId } : null },
      }),
    },
  } as never);
}

describe("POST /api/ai/hashtags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth(null);

    const req = new Request("http://localhost/api/ai/hashtags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Hello world" }),
    });

    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it("returns 400 when content is missing", async () => {
    mockAuth(TEST_USER_ID);

    const req = new Request("http://localhost/api/ai/hashtags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("returns 400 when content is empty", async () => {
    mockAuth(TEST_USER_ID);

    const req = new Request("http://localhost/api/ai/hashtags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "" }),
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("returns suggestions on success", async () => {
    mockAuth(TEST_USER_ID);

    const suggestions = [
      { tag: "react", relevance: "high" },
      { tag: "nextjs", relevance: "medium" },
      { tag: "webdev", relevance: "low" },
    ];
    vi.mocked(suggestHashtags).mockResolvedValue(suggestions);

    const req = new Request("http://localhost/api/ai/hashtags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Building with React and Next.js" }),
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.suggestions).toEqual(suggestions);
    expect(suggestHashtags).toHaveBeenCalledWith(
      TEST_USER_ID,
      "Building with React and Next.js",
    );
  });

  it("returns 500 when service throws", async () => {
    mockAuth(TEST_USER_ID);
    vi.mocked(suggestHashtags).mockRejectedValue(new Error("AI failed"));

    const req = new Request("http://localhost/api/ai/hashtags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Hello world" }),
    });

    const response = await POST(req);
    expect(response.status).toBe(500);
  });
});
