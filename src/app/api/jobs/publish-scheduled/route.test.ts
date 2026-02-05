import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/services/publishing", () => ({
  publishPost: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { publishPost } from "@/lib/services/publishing";

function mockSupabase(overrides: { posts?: unknown[]; error?: unknown } = {}) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
  };

  for (const method of Object.keys(chain)) {
    chain[method].mockReturnValue(chain);
  }

  // Terminal: lte resolves with data
  chain.lte.mockResolvedValue({
    data: overrides.posts ?? [],
    error: overrides.error ?? null,
  });

  const from = vi.fn().mockReturnValue(chain);
  vi.mocked(createAdminClient).mockReturnValue({ from } as never);

  return { from, chain };
}

describe("POST /api/jobs/publish-scheduled", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
  });

  async function importPOST() {
    const mod = await import("./route");
    return mod.POST;
  }

  it("returns 401 without authorization header", async () => {
    const POST = await importPOST();
    const request = new Request(
      "http://localhost:3000/api/jobs/publish-scheduled",
      { method: "POST" },
    );
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("returns 401 with invalid cron secret", async () => {
    const POST = await importPOST();
    const request = new Request(
      "http://localhost:3000/api/jobs/publish-scheduled",
      {
        method: "POST",
        headers: { Authorization: "Bearer wrong-secret" },
      },
    );
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("returns 200 with valid cron secret and no posts due", async () => {
    mockSupabase({ posts: [] });

    const POST = await importPOST();
    const request = new Request(
      "http://localhost:3000/api/jobs/publish-scheduled",
      {
        method: "POST",
        headers: { Authorization: "Bearer test-cron-secret" },
      },
    );
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.processed).toBe(0);
  });

  it("publishes due posts and returns summary", async () => {
    const duePosts = [
      { id: "post-1", user_id: "user-1", status: "scheduled" },
      { id: "post-2", user_id: "user-2", status: "scheduled" },
    ];
    mockSupabase({ posts: duePosts });

    vi.mocked(publishPost).mockResolvedValue([
      { platform: "twitter", success: true },
    ] as never);

    const POST = await importPOST();
    const request = new Request(
      "http://localhost:3000/api/jobs/publish-scheduled",
      {
        method: "POST",
        headers: { Authorization: "Bearer test-cron-secret" },
      },
    );
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.processed).toBe(2);
    expect(publishPost).toHaveBeenCalledTimes(2);
    expect(publishPost).toHaveBeenCalledWith("user-1", "post-1");
    expect(publishPost).toHaveBeenCalledWith("user-2", "post-2");
  });

  it("continues processing when one post fails", async () => {
    const duePosts = [
      { id: "post-1", user_id: "user-1", status: "scheduled" },
      { id: "post-2", user_id: "user-2", status: "scheduled" },
    ];
    mockSupabase({ posts: duePosts });

    vi.mocked(publishPost)
      .mockRejectedValueOnce(new Error("Publish error"))
      .mockResolvedValueOnce([
        { platform: "twitter", success: true },
      ] as never);

    const POST = await importPOST();
    const request = new Request(
      "http://localhost:3000/api/jobs/publish-scheduled",
      {
        method: "POST",
        headers: { Authorization: "Bearer test-cron-secret" },
      },
    );
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.processed).toBe(2);
    expect(body.failed).toBe(1);
    expect(publishPost).toHaveBeenCalledTimes(2);
  });
});
