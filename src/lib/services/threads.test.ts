import { describe, it, expect, vi, beforeEach } from "vitest";
import { createThread, getThreadPosts, deleteThread } from "./threads";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";

function mockSupabase() {
  const chain = {
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
  };
  return chain;
}

describe("createThread", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates thread record and posts with positions", async () => {
    const chain = mockSupabase();
    // Thread insert → select → single
    chain.single.mockResolvedValueOnce({
      data: { id: "thread-1", user_id: "user-1", title: "My Thread", status: "draft" },
      error: null,
    });
    // Posts insert → select → order
    chain.order.mockResolvedValueOnce({
      data: [
        { id: "post-1", thread_position: 0, body: "First" },
        { id: "post-2", thread_position: 1, body: "Second" },
      ],
      error: null,
    });
    vi.mocked(createAdminClient).mockReturnValue(chain as never);

    const result = await createThread("user-1", {
      title: "My Thread",
      posts: [{ body: "First" }, { body: "Second" }],
    });

    expect(result.thread.id).toBe("thread-1");
    expect(result.posts).toHaveLength(2);
    expect(chain.from).toHaveBeenCalledWith("threads");
    expect(chain.insert).toHaveBeenCalledTimes(2); // thread + posts
  });

  it("throws on thread insert error", async () => {
    const chain = mockSupabase();
    chain.single.mockResolvedValueOnce({
      data: null,
      error: { code: "23505", message: "duplicate" },
    });
    vi.mocked(createAdminClient).mockReturnValue(chain as never);

    await expect(
      createThread("user-1", { posts: [{ body: "A" }, { body: "B" }] }),
    ).rejects.toThrow("Failed to create thread");
  });
});

describe("getThreadPosts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns posts ordered by thread_position", async () => {
    const chain = mockSupabase();
    chain.order.mockResolvedValueOnce({
      data: [
        { id: "post-1", thread_position: 0, body: "First" },
        { id: "post-2", thread_position: 1, body: "Second" },
      ],
      error: null,
    });
    vi.mocked(createAdminClient).mockReturnValue(chain as never);

    const posts = await getThreadPosts("thread-1");

    expect(posts).toHaveLength(2);
    expect(chain.eq).toHaveBeenCalledWith("thread_id", "thread-1");
    expect(chain.order).toHaveBeenCalledWith("thread_position", { ascending: true });
  });
});

describe("deleteThread", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("soft-deletes thread posts and deletes thread record", async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
    // The first .eq chain (posts update) returns the chain, second .eq resolves
    let eqCallCount = 0;
    chain.eq.mockImplementation(() => {
      eqCallCount++;
      // After posts update .eq("user_id", ...) resolves the update
      if (eqCallCount === 2) return Promise.resolve({ error: null });
      // After threads delete .eq("id", ...) resolves the delete
      if (eqCallCount === 3) return Promise.resolve({ error: null });
      return chain;
    });
    vi.mocked(createAdminClient).mockReturnValue(chain as never);

    await deleteThread("thread-1", "user-1");

    expect(chain.from).toHaveBeenCalledWith("posts");
    expect(chain.from).toHaveBeenCalledWith("threads");
  });
});
