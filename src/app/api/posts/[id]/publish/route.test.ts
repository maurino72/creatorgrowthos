import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/services/publishing", () => ({
  publishPost: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { publishPost } from "@/lib/services/publishing";

function mockAuth(userId: string | null) {
  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userId ? { id: userId } : null },
        error: userId ? null : { message: "No session" },
      }),
    },
  };
  vi.mocked(createClient).mockResolvedValue(supabase as never);
}

type RouteParams = { params: Promise<{ id: string }> };

function makeParams(id: string): RouteParams {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/posts/:id/publish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function importPOST() {
    const mod = await import("./route");
    return mod.POST;
  }

  it("returns 401 for unauthenticated user", async () => {
    mockAuth(null);
    const POST = await importPOST();
    const request = new Request(
      "http://localhost:3000/api/posts/post-1/publish",
      { method: "POST" },
    );
    const response = await POST(request, makeParams("post-1"));
    expect(response.status).toBe(401);
  });

  it("publishes and returns results with 200", async () => {
    mockAuth("user-123");
    const mockResults = [
      {
        platform: "twitter",
        success: true,
        platformPostId: "tw-123",
        platformUrl: "https://twitter.com/i/status/tw-123",
      },
    ];
    vi.mocked(publishPost).mockResolvedValue(mockResults as never);

    const POST = await importPOST();
    const request = new Request(
      "http://localhost:3000/api/posts/post-1/publish",
      { method: "POST" },
    );
    const response = await POST(request, makeParams("post-1"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.results).toHaveLength(1);
    expect(body.results[0].success).toBe(true);
    expect(publishPost).toHaveBeenCalledWith("user-123", "post-1");
  });

  it("returns 404 when post not found", async () => {
    mockAuth("user-123");
    vi.mocked(publishPost).mockRejectedValue(new Error("Post not found"));

    const POST = await importPOST();
    const request = new Request(
      "http://localhost:3000/api/posts/post-1/publish",
      { method: "POST" },
    );
    const response = await POST(request, makeParams("post-1"));
    expect(response.status).toBe(404);
  });

  it("returns 400 when post is in invalid status", async () => {
    mockAuth("user-123");
    vi.mocked(publishPost).mockRejectedValue(
      new Error("Post must be in draft or failed status to publish"),
    );

    const POST = await importPOST();
    const request = new Request(
      "http://localhost:3000/api/posts/post-1/publish",
      { method: "POST" },
    );
    const response = await POST(request, makeParams("post-1"));
    expect(response.status).toBe(400);
  });

  it("returns results even when some platforms fail", async () => {
    mockAuth("user-123");
    const mockResults = [
      { platform: "twitter", success: true, platformPostId: "tw-123" },
      { platform: "linkedin", success: false, error: "Rate limited" },
    ];
    vi.mocked(publishPost).mockResolvedValue(mockResults as never);

    const POST = await importPOST();
    const request = new Request(
      "http://localhost:3000/api/posts/post-1/publish",
      { method: "POST" },
    );
    const response = await POST(request, makeParams("post-1"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.results).toHaveLength(2);
    expect(body.results[1].success).toBe(false);
  });
});
