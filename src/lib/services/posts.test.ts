import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import {
  createPost,
  getPostsForUser,
  getPostById,
  updatePost,
  deletePost,
} from "./posts";

const TEST_USER_ID = "user-123";

function mockSupabase() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
  };

  // All chainable methods return the chain
  for (const method of Object.keys(chain)) {
    chain[method].mockReturnValue(chain);
  }

  const from = vi.fn().mockReturnValue(chain);
  vi.mocked(createAdminClient).mockReturnValue({ from } as never);

  return { from, chain };
}

describe("posts service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createPost", () => {
    it("inserts a post with draft status when no scheduled_at", async () => {
      const { from, chain } = mockSupabase();
      const mockPost = {
        id: "post-1",
        user_id: TEST_USER_ID,
        body: "Hello world!",
        status: "draft",
        scheduled_at: null,
      };

      chain.single.mockResolvedValue({ data: mockPost, error: null });

      const result = await createPost(TEST_USER_ID, {
        body: "Hello world!",
        platforms: ["twitter"],
      });

      expect(from).toHaveBeenCalledWith("posts");
      const insertCall = chain.insert.mock.calls[0][0];
      expect(insertCall.user_id).toBe(TEST_USER_ID);
      expect(insertCall.body).toBe("Hello world!");
      expect(insertCall.status).toBe("draft");
      expect(insertCall.scheduled_at).toBeNull();
      expect(result.id).toBe("post-1");
    });

    it("inserts a post with scheduled status when scheduled_at is provided", async () => {
      const { chain } = mockSupabase();
      const futureDate = new Date(Date.now() + 3600000).toISOString();
      const mockPost = {
        id: "post-2",
        user_id: TEST_USER_ID,
        body: "Scheduled post",
        status: "scheduled",
        scheduled_at: futureDate,
      };

      chain.single.mockResolvedValue({ data: mockPost, error: null });

      await createPost(TEST_USER_ID, {
        body: "Scheduled post",
        platforms: ["twitter"],
        scheduled_at: futureDate,
      });

      const insertCall = chain.insert.mock.calls[0][0];
      expect(insertCall.status).toBe("scheduled");
      expect(insertCall.scheduled_at).toBe(futureDate);
    });

    it("creates post_publications records for each platform", async () => {
      const { from, chain } = mockSupabase();
      const mockPost = {
        id: "post-3",
        user_id: TEST_USER_ID,
        body: "Multi-platform",
        status: "draft",
      };

      chain.single.mockResolvedValue({ data: mockPost, error: null });
      // Second insert call (publications) resolves without error
      chain.insert.mockImplementation(() => {
        // When called for post_publications, return a resolved promise
        return chain;
      });

      await createPost(TEST_USER_ID, {
        body: "Multi-platform",
        platforms: ["twitter", "linkedin"],
      });

      // First call: insert into posts
      expect(from).toHaveBeenCalledWith("posts");
      // Second call: insert into post_publications
      expect(from).toHaveBeenCalledWith("post_publications");
    });

    it("throws on database error during post creation", async () => {
      const { chain } = mockSupabase();
      chain.single.mockResolvedValue({
        data: null,
        error: { message: "Insert failed" },
      });

      await expect(
        createPost(TEST_USER_ID, {
          body: "Hello",
          platforms: ["twitter"],
        }),
      ).rejects.toThrow("Insert failed");
    });
  });

  describe("getPostsForUser", () => {
    it("fetches posts excluding soft-deleted ones", async () => {
      const { chain } = mockSupabase();
      const mockPosts = [
        { id: "post-1", body: "Post 1", status: "draft" },
        { id: "post-2", body: "Post 2", status: "published" },
      ];

      chain.range.mockResolvedValue({ data: mockPosts, error: null });

      const result = await getPostsForUser(TEST_USER_ID);

      expect(result).toHaveLength(2);
      expect(chain.is).toHaveBeenCalledWith("deleted_at", null);
    });

    it("filters by status when provided", async () => {
      const { chain } = mockSupabase();
      chain.range.mockResolvedValue({ data: [], error: null });

      await getPostsForUser(TEST_USER_ID, { status: "draft" });

      expect(chain.eq).toHaveBeenCalledWith("status", "draft");
    });

    it("applies limit and offset", async () => {
      const { chain } = mockSupabase();
      chain.range.mockResolvedValue({ data: [], error: null });

      await getPostsForUser(TEST_USER_ID, { limit: 10, offset: 20 });

      expect(chain.range).toHaveBeenCalledWith(20, 29);
    });

    it("uses default limit of 20 and offset of 0", async () => {
      const { chain } = mockSupabase();
      chain.range.mockResolvedValue({ data: [], error: null });

      await getPostsForUser(TEST_USER_ID);

      expect(chain.range).toHaveBeenCalledWith(0, 19);
    });

    it("orders by created_at desc by default", async () => {
      const { chain } = mockSupabase();
      chain.range.mockResolvedValue({ data: [], error: null });

      await getPostsForUser(TEST_USER_ID);

      expect(chain.order).toHaveBeenCalledWith("created_at", {
        ascending: false,
      });
    });

    it("filters by platform when provided", async () => {
      const { chain } = mockSupabase();
      chain.range.mockResolvedValue({ data: [], error: null });

      await getPostsForUser(TEST_USER_ID, { platform: "twitter" });

      expect(chain.select).toHaveBeenCalledWith("*, post_publications!inner(*)");
      expect(chain.eq).toHaveBeenCalledWith("post_publications.platform", "twitter");
    });

    it("uses regular join when no platform filter", async () => {
      const { chain } = mockSupabase();
      chain.range.mockResolvedValue({ data: [], error: null });

      await getPostsForUser(TEST_USER_ID);

      expect(chain.select).toHaveBeenCalledWith("*, post_publications(*)");
    });

    it("throws on database error", async () => {
      const { chain } = mockSupabase();
      chain.range.mockResolvedValue({
        data: null,
        error: { message: "Query failed" },
      });

      await expect(getPostsForUser(TEST_USER_ID)).rejects.toThrow(
        "Query failed",
      );
    });
  });

  describe("getPostById", () => {
    it("fetches a single post with publications", async () => {
      const { chain } = mockSupabase();
      const mockPost = {
        id: "post-1",
        body: "Hello",
        status: "draft",
        post_publications: [],
      };

      chain.single.mockResolvedValue({ data: mockPost, error: null });

      const result = await getPostById(TEST_USER_ID, "post-1");

      expect(result).toEqual(mockPost);
      expect(chain.select).toHaveBeenCalledWith("*, post_publications(*)");
    });

    it("returns null when post not found", async () => {
      const { chain } = mockSupabase();
      chain.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });

      const result = await getPostById(TEST_USER_ID, "nonexistent");

      expect(result).toBeNull();
    });

    it("excludes soft-deleted posts", async () => {
      const { chain } = mockSupabase();
      chain.single.mockResolvedValue({ data: null, error: null });

      await getPostById(TEST_USER_ID, "post-1");

      expect(chain.is).toHaveBeenCalledWith("deleted_at", null);
    });

    it("throws on database error", async () => {
      const { chain } = mockSupabase();
      chain.single.mockResolvedValue({
        data: null,
        error: { code: "UNEXPECTED", message: "DB error" },
      });

      await expect(
        getPostById(TEST_USER_ID, "post-1"),
      ).rejects.toThrow("DB error");
    });
  });

  describe("updatePost", () => {
    it("updates body of a draft post", async () => {
      const { from, chain } = mockSupabase();
      // First call: getPostById
      const existingPost = {
        id: "post-1",
        body: "Old body",
        status: "draft",
        post_publications: [{ platform: "twitter" }],
      };
      chain.single
        .mockResolvedValueOnce({ data: existingPost, error: null })
        // Second call: update
        .mockResolvedValueOnce({
          data: { ...existingPost, body: "New body" },
          error: null,
        });

      const result = await updatePost(TEST_USER_ID, "post-1", {
        body: "New body",
      });

      expect(from).toHaveBeenCalledWith("posts");
      expect(result.body).toBe("New body");
    });

    it("changes status from draft to scheduled when scheduled_at is set", async () => {
      const { chain } = mockSupabase();
      const futureDate = new Date(Date.now() + 3600000).toISOString();
      const existingPost = {
        id: "post-1",
        body: "Hello",
        status: "draft",
        post_publications: [],
      };

      chain.single
        .mockResolvedValueOnce({ data: existingPost, error: null })
        .mockResolvedValueOnce({
          data: { ...existingPost, status: "scheduled", scheduled_at: futureDate },
          error: null,
        });

      await updatePost(TEST_USER_ID, "post-1", {
        scheduled_at: futureDate,
      });

      const updateCall = chain.update.mock.calls[0][0];
      expect(updateCall.status).toBe("scheduled");
      expect(updateCall.scheduled_at).toBe(futureDate);
    });

    it("changes status from scheduled to draft when scheduled_at is cleared", async () => {
      const { chain } = mockSupabase();
      const existingPost = {
        id: "post-1",
        body: "Hello",
        status: "scheduled",
        scheduled_at: new Date().toISOString(),
        post_publications: [],
      };

      chain.single
        .mockResolvedValueOnce({ data: existingPost, error: null })
        .mockResolvedValueOnce({
          data: { ...existingPost, status: "draft", scheduled_at: null },
          error: null,
        });

      await updatePost(TEST_USER_ID, "post-1", {
        scheduled_at: null,
      });

      const updateCall = chain.update.mock.calls[0][0];
      expect(updateCall.status).toBe("draft");
      expect(updateCall.scheduled_at).toBeNull();
    });

    it("rejects editing a published post", async () => {
      const { chain } = mockSupabase();
      chain.single.mockResolvedValueOnce({
        data: { id: "post-1", status: "published", post_publications: [] },
        error: null,
      });

      await expect(
        updatePost(TEST_USER_ID, "post-1", { body: "Edit attempt" }),
      ).rejects.toThrow("Cannot edit a published post");
    });

    it("allows editing a failed post", async () => {
      const { chain } = mockSupabase();
      const existingPost = {
        id: "post-1",
        body: "Failed post",
        status: "failed",
        post_publications: [],
      };

      chain.single
        .mockResolvedValueOnce({ data: existingPost, error: null })
        .mockResolvedValueOnce({
          data: { ...existingPost, body: "Fixed post", status: "draft" },
          error: null,
        });

      const result = await updatePost(TEST_USER_ID, "post-1", {
        body: "Fixed post",
      });

      expect(result.status).toBe("draft");
    });

    it("changes failed status to draft when editing", async () => {
      const { chain } = mockSupabase();
      const existingPost = {
        id: "post-1",
        body: "Failed",
        status: "failed",
        post_publications: [],
      };

      chain.single
        .mockResolvedValueOnce({ data: existingPost, error: null })
        .mockResolvedValueOnce({
          data: { ...existingPost, status: "draft" },
          error: null,
        });

      await updatePost(TEST_USER_ID, "post-1", { body: "Retry" });

      const updateCall = chain.update.mock.calls[0][0];
      expect(updateCall.status).toBe("draft");
    });

    it("throws when post not found", async () => {
      const { chain } = mockSupabase();
      chain.single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });

      await expect(
        updatePost(TEST_USER_ID, "nonexistent", { body: "Hello" }),
      ).rejects.toThrow("Post not found");
    });
  });

  describe("deletePost", () => {
    it("soft deletes a post by setting deleted_at and status", async () => {
      const { from, chain } = mockSupabase();
      // getPostById lookup, then update+select+single
      chain.single
        .mockResolvedValueOnce({
          data: { id: "post-1", status: "draft", post_publications: [] },
          error: null,
        })
        .mockResolvedValueOnce({ data: { id: "post-1" }, error: null });

      await deletePost(TEST_USER_ID, "post-1");

      // Should update posts table
      expect(from).toHaveBeenCalledWith("posts");
      expect(chain.update).toHaveBeenCalled();
      const updateCall = chain.update.mock.calls[0][0];
      expect(updateCall.status).toBe("deleted");
      expect(updateCall.deleted_at).toBeDefined();
    });

    it("throws when post not found", async () => {
      const { chain } = mockSupabase();
      chain.single.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });

      await expect(deletePost(TEST_USER_ID, "nonexistent")).rejects.toThrow(
        "Post not found",
      );
    });

    it("throws on database error", async () => {
      const { chain } = mockSupabase();
      chain.single
        .mockResolvedValueOnce({
          data: { id: "post-1", status: "draft", post_publications: [] },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: { message: "Update failed" },
        });

      await expect(deletePost(TEST_USER_ID, "post-1")).rejects.toThrow(
        "Update failed",
      );
    });
  });
});
