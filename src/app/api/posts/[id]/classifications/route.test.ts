import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH } from "./route";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/services/classification", () => ({
  updateClassifications: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { updateClassifications } from "@/lib/services/classification";

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

function makeRequest(body: unknown) {
  return new Request("http://localhost", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/posts/[id]/classifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth(null);

    const res = await PATCH(makeRequest({ intent: "educate" }), makeContext("post-1"));
    expect(res.status).toBe(401);
  });

  it("returns updated post on success", async () => {
    mockAuth({ id: "user-1" });
    vi.mocked(updateClassifications).mockResolvedValueOnce({
      id: "post-1",
      intent: "promote",
      content_type: "single",
      topics: ["startup"],
      ai_assisted: false,
    } as never);

    const res = await PATCH(
      makeRequest({ intent: "promote", content_type: "single", topics: ["startup"] }),
      makeContext("post-1"),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.post.intent).toBe("promote");
    expect(json.post.ai_assisted).toBe(false);
    expect(updateClassifications).toHaveBeenCalledWith("user-1", "post-1", {
      intent: "promote",
      content_type: "single",
      topics: ["startup"],
    });
  });

  it("returns 400 for invalid input", async () => {
    mockAuth({ id: "user-1" });

    const res = await PATCH(makeRequest({}), makeContext("post-1"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid intent value", async () => {
    mockAuth({ id: "user-1" });

    const res = await PATCH(makeRequest({ intent: "spam" }), makeContext("post-1"));
    expect(res.status).toBe(400);
  });

  it("accepts partial override with just intent", async () => {
    mockAuth({ id: "user-1" });
    vi.mocked(updateClassifications).mockResolvedValueOnce({
      id: "post-1",
      intent: "curate",
      ai_assisted: false,
    } as never);

    const res = await PATCH(makeRequest({ intent: "curate" }), makeContext("post-1"));
    expect(res.status).toBe(200);
    expect(updateClassifications).toHaveBeenCalledWith("user-1", "post-1", {
      intent: "curate",
    });
  });
});
