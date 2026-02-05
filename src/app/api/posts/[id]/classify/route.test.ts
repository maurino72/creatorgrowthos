import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/services/classification", () => ({
  classifyPost: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { classifyPost } from "@/lib/services/classification";

function mockAuth(user: { id: string } | null) {
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
      }),
    },
  } as never);
}

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/posts/[id]/classify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth(null);

    const res = await POST(new Request("http://localhost"), makeContext("post-1"));
    expect(res.status).toBe(401);
  });

  it("returns classification on success", async () => {
    mockAuth({ id: "user-1" });
    vi.mocked(classifyPost).mockResolvedValueOnce({
      intent: "educate",
      content_type: "single",
      topics: ["ai", "saas"],
    });

    const res = await POST(new Request("http://localhost"), makeContext("post-1"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.classifications.intent).toBe("educate");
    expect(json.classifications.topics).toEqual(["ai", "saas"]);
    expect(classifyPost).toHaveBeenCalledWith("user-1", "post-1");
  });

  it("returns 404 when post not found", async () => {
    mockAuth({ id: "user-1" });
    vi.mocked(classifyPost).mockRejectedValueOnce(new Error("Post not found"));

    const res = await POST(new Request("http://localhost"), makeContext("missing"));
    expect(res.status).toBe(404);
  });

  it("returns 500 on AI failure", async () => {
    mockAuth({ id: "user-1" });
    vi.mocked(classifyPost).mockRejectedValueOnce(
      new Error("Failed to parse AI classification response"),
    );

    const res = await POST(new Request("http://localhost"), makeContext("post-1"));
    expect(res.status).toBe(500);
  });
});
