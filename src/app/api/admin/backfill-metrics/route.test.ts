import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/inngest/client", () => ({
  inngest: {
    send: vi.fn(),
  },
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { inngest } from "@/lib/inngest/client";

function mockSupabase(publications: unknown[] = []) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
  };

  // Terminal call returns the data
  chain.not.mockResolvedValue({ data: publications, error: null });

  const from = vi.fn().mockReturnValue(chain);
  vi.mocked(createAdminClient).mockReturnValue({ from } as never);

  return { from, chain };
}

async function callRoute(secret?: string) {
  const { POST } = await import("./route");
  const headers: Record<string, string> = {};
  if (secret) headers["authorization"] = `Bearer ${secret}`;

  const request = new Request("http://localhost/api/admin/backfill-metrics", {
    method: "POST",
    headers,
  });

  return POST(request);
}

describe("POST /api/admin/backfill-metrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("ADMIN_SECRET", "test-admin-secret");
  });

  it("returns 401 when no authorization header", async () => {
    mockSupabase();
    const response = await callRoute();
    expect(response.status).toBe(401);
  });

  it("returns 401 when authorization header is wrong", async () => {
    mockSupabase();
    const response = await callRoute("wrong-secret");
    expect(response.status).toBe(401);
  });

  it("returns 200 with count 0 when no published posts", async () => {
    mockSupabase([]);
    const response = await callRoute("test-admin-secret");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.triggered).toBe(0);
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it("sends post/published events for each publication", async () => {
    mockSupabase([
      {
        id: "pub-uuid-1",
        platform: "twitter",
        platform_post_id: "tw-123",
        posts: { user_id: "user-1", id: "post-1" },
      },
      {
        id: "pub-uuid-2",
        platform: "linkedin",
        platform_post_id: "li-456",
        posts: { user_id: "user-1", id: "post-2" },
      },
    ]);

    vi.mocked(inngest.send).mockResolvedValue(undefined as never);

    const response = await callRoute("test-admin-secret");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.triggered).toBe(2);

    expect(inngest.send).toHaveBeenCalledWith([
      {
        name: "post/published",
        data: {
          postId: "post-1",
          userId: "user-1",
          publicationId: "pub-uuid-1",
          platform: "twitter",
        },
      },
      {
        name: "post/published",
        data: {
          postId: "post-2",
          userId: "user-1",
          publicationId: "pub-uuid-2",
          platform: "linkedin",
        },
      },
    ]);
  });

  it("queries post_publications with correct filters", async () => {
    const { from, chain } = mockSupabase([]);
    await callRoute("test-admin-secret");

    expect(from).toHaveBeenCalledWith("post_publications");
    expect(chain.select).toHaveBeenCalledWith(
      "id, platform, platform_post_id, posts!inner(id, user_id)",
    );
    expect(chain.eq).toHaveBeenCalledWith("status", "published");
    expect(chain.not).toHaveBeenCalledWith("platform_post_id", "is", null);
  });

  it("returns 500 when database query fails", async () => {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
    };
    chain.not.mockResolvedValue({ data: null, error: { message: "DB error" } });
    const from = vi.fn().mockReturnValue(chain);
    vi.mocked(createAdminClient).mockReturnValue({ from } as never);

    const response = await callRoute("test-admin-secret");
    expect(response.status).toBe(500);
  });
});
