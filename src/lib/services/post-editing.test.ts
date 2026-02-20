import { describe, it, expect, vi, beforeEach } from "vitest";
import { canEditPost, editPublishedPost, MAX_EDITS, EDIT_WINDOW_MS } from "./post-editing";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";

describe("canEditPost", () => {
  it("returns true for recently published post within edit limit", () => {
    const post = {
      status: "published",
      edit_count: 0,
      first_published_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 min ago
      editable_until: new Date(Date.now() + 20 * 60 * 1000).toISOString(), // 20 min from now
    };

    const result = canEditPost(post);
    expect(result.canEdit).toBe(true);
  });

  it("returns false when edit window has expired", () => {
    const post = {
      status: "published",
      edit_count: 0,
      first_published_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 60 min ago
      editable_until: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // expired 30 min ago
    };

    const result = canEditPost(post);
    expect(result.canEdit).toBe(false);
    expect(result.reason).toContain("window");
  });

  it("returns false when max edits reached", () => {
    const post = {
      status: "published",
      edit_count: MAX_EDITS,
      first_published_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      editable_until: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
    };

    const result = canEditPost(post);
    expect(result.canEdit).toBe(false);
    expect(result.reason).toContain("maximum");
  });

  it("returns false for non-published post", () => {
    const post = {
      status: "draft",
      edit_count: 0,
      first_published_at: null,
      editable_until: null,
    };

    const result = canEditPost(post);
    expect(result.canEdit).toBe(false);
    expect(result.reason).toContain("published");
  });

  it("returns false when first_published_at is null", () => {
    const post = {
      status: "published",
      edit_count: 0,
      first_published_at: null,
      editable_until: null,
    };

    const result = canEditPost(post);
    expect(result.canEdit).toBe(false);
  });
});

describe("editPublishedPost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates post body and increments edit_count", async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      single: vi.fn(),
      update: vi.fn().mockReturnThis(),
    };

    // Fetch post
    chain.single.mockResolvedValueOnce({
      data: {
        id: "post-1",
        user_id: "user-1",
        body: "Original text",
        status: "published",
        edit_count: 0,
        first_published_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        editable_until: new Date(Date.now() + 25 * 60 * 1000).toISOString(),
      },
      error: null,
    });

    // Update post
    chain.single.mockResolvedValueOnce({
      data: {
        id: "post-1",
        body: "Updated text",
        edit_count: 1,
      },
      error: null,
    });

    vi.mocked(createAdminClient).mockReturnValue(chain as never);

    const result = await editPublishedPost("user-1", "post-1", "Updated text");

    expect(result.body).toBe("Updated text");
    expect(result.edit_count).toBe(1);
    expect(chain.update).toHaveBeenCalled();
  });

  it("throws when post is not editable", async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValueOnce({
        data: {
          id: "post-1",
          user_id: "user-1",
          status: "draft",
          edit_count: 0,
          first_published_at: null,
          editable_until: null,
        },
        error: null,
      }),
    };
    vi.mocked(createAdminClient).mockReturnValue(chain as never);

    await expect(
      editPublishedPost("user-1", "post-1", "Updated"),
    ).rejects.toThrow("not editable");
  });

  it("throws when post not found", async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116", message: "not found" },
      }),
    };
    vi.mocked(createAdminClient).mockReturnValue(chain as never);

    await expect(
      editPublishedPost("user-1", "nonexistent", "Updated"),
    ).rejects.toThrow("not found");
  });
});

describe("constants", () => {
  it("MAX_EDITS is 5", () => {
    expect(MAX_EDITS).toBe(5);
  });

  it("EDIT_WINDOW_MS is 30 minutes", () => {
    expect(EDIT_WINDOW_MS).toBe(30 * 60 * 1000);
  });
});
