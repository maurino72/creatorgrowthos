import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/services/posts", () => ({
  getPostById: vi.fn(),
  updatePost: vi.fn(),
  deletePost: vi.fn(),
}));

vi.mock("@/lib/inngest/send", () => ({
  sendPostUpdated: vi.fn().mockResolvedValue(undefined),
  sendPostScheduled: vi.fn().mockResolvedValue(undefined),
  sendPostScheduleCancelled: vi.fn().mockResolvedValue(undefined),
}));

import { createClient } from "@/lib/supabase/server";
import { getPostById, updatePost, deletePost } from "@/lib/services/posts";
import {
  sendPostUpdated,
  sendPostScheduled,
  sendPostScheduleCancelled,
} from "@/lib/inngest/send";

type RouteParams = { params: Promise<{ id: string }> };

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

function makeParams(id: string): RouteParams {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/posts/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function importGET() {
    const mod = await import("./route");
    return mod.GET;
  }

  it("returns 401 for unauthenticated user", async () => {
    mockAuth(null);
    const GET = await importGET();
    const request = new Request("http://localhost:3000/api/posts/post-1");
    const response = await GET(request, makeParams("post-1"));
    expect(response.status).toBe(401);
  });

  it("returns 404 when post not found", async () => {
    mockAuth("user-123");
    vi.mocked(getPostById).mockResolvedValue(null);

    const GET = await importGET();
    const request = new Request("http://localhost:3000/api/posts/nonexistent");
    const response = await GET(request, makeParams("nonexistent"));
    expect(response.status).toBe(404);
  });

  it("returns post with publications", async () => {
    mockAuth("user-123");
    const mockPost = {
      id: "post-1",
      body: "Hello",
      status: "draft",
      post_publications: [{ platform: "twitter", status: "pending" }],
    };
    vi.mocked(getPostById).mockResolvedValue(mockPost as never);

    const GET = await importGET();
    const request = new Request("http://localhost:3000/api/posts/post-1");
    const response = await GET(request, makeParams("post-1"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.post.id).toBe("post-1");
    expect(body.post.post_publications).toHaveLength(1);
  });
});

describe("PATCH /api/posts/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function importPATCH() {
    const mod = await import("./route");
    return mod.PATCH;
  }

  it("returns 401 for unauthenticated user", async () => {
    mockAuth(null);
    const PATCH = await importPATCH();
    const request = new Request("http://localhost:3000/api/posts/post-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "Updated" }),
    });
    const response = await PATCH(request, makeParams("post-1"));
    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid input", async () => {
    mockAuth("user-123");
    const PATCH = await importPATCH();
    const request = new Request("http://localhost:3000/api/posts/post-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "a".repeat(3001) }),
    });
    const response = await PATCH(request, makeParams("post-1"));
    expect(response.status).toBe(400);
  });

  it("updates and returns the post", async () => {
    mockAuth("user-123");
    const mockUpdated = {
      id: "post-1",
      body: "Updated body",
      status: "draft",
    };
    vi.mocked(updatePost).mockResolvedValue(mockUpdated as never);

    const PATCH = await importPATCH();
    const request = new Request("http://localhost:3000/api/posts/post-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "Updated body" }),
    });
    const response = await PATCH(request, makeParams("post-1"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.post.body).toBe("Updated body");
    expect(updatePost).toHaveBeenCalledWith("user-123", "post-1", {
      body: "Updated body",
    });
  });

  it("returns 400 when trying to edit a published post", async () => {
    mockAuth("user-123");
    vi.mocked(updatePost).mockRejectedValue(
      new Error("Cannot edit a published post"),
    );

    const PATCH = await importPATCH();
    const request = new Request("http://localhost:3000/api/posts/post-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "Edit attempt" }),
    });
    const response = await PATCH(request, makeParams("post-1"));
    expect(response.status).toBe(400);
  });

  it("returns 404 when post not found", async () => {
    mockAuth("user-123");
    vi.mocked(updatePost).mockRejectedValue(new Error("Post not found"));

    const PATCH = await importPATCH();
    const request = new Request("http://localhost:3000/api/posts/post-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "Hello" }),
    });
    const response = await PATCH(request, makeParams("post-1"));
    expect(response.status).toBe(404);
  });

  it("sends cancel then schedule events when rescheduling a post", async () => {
    mockAuth("user-123");
    const mockUpdated = {
      id: "post-1",
      body: "Test",
      status: "scheduled",
      scheduled_at: "2099-12-01T10:00:00Z",
    };
    vi.mocked(updatePost).mockResolvedValue(mockUpdated as never);

    const PATCH = await importPATCH();
    const request = new Request("http://localhost:3000/api/posts/post-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduled_at: "2099-12-01T10:00:00Z" }),
    });
    const response = await PATCH(request, makeParams("post-1"));

    expect(response.status).toBe(200);
    expect(sendPostScheduleCancelled).toHaveBeenCalledWith("post-1", "user-123");
    expect(sendPostScheduled).toHaveBeenCalledWith(
      "post-1",
      "user-123",
      "2099-12-01T10:00:00Z",
    );
  });

  it("sends only cancel event when scheduled_at is set to null", async () => {
    mockAuth("user-123");
    const mockUpdated = {
      id: "post-1",
      body: "Test",
      status: "draft",
      scheduled_at: null,
    };
    vi.mocked(updatePost).mockResolvedValue(mockUpdated as never);

    const PATCH = await importPATCH();
    const request = new Request("http://localhost:3000/api/posts/post-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduled_at: null }),
    });
    const response = await PATCH(request, makeParams("post-1"));

    expect(response.status).toBe(200);
    expect(sendPostScheduleCancelled).toHaveBeenCalledWith("post-1", "user-123");
    expect(sendPostScheduled).not.toHaveBeenCalled();
  });

  it("sends updated event but no schedule events when only body changes", async () => {
    mockAuth("user-123");
    const mockUpdated = {
      id: "post-1",
      body: "New body",
      status: "draft",
    };
    vi.mocked(updatePost).mockResolvedValue(mockUpdated as never);

    const PATCH = await importPATCH();
    const request = new Request("http://localhost:3000/api/posts/post-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "New body" }),
    });
    const response = await PATCH(request, makeParams("post-1"));

    expect(response.status).toBe(200);
    expect(sendPostUpdated).toHaveBeenCalledWith("post-1", "user-123", ["body"]);
    expect(sendPostScheduled).not.toHaveBeenCalled();
    expect(sendPostScheduleCancelled).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/posts/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function importDELETE() {
    const mod = await import("./route");
    return mod.DELETE;
  }

  it("returns 401 for unauthenticated user", async () => {
    mockAuth(null);
    const DELETE = await importDELETE();
    const request = new Request("http://localhost:3000/api/posts/post-1", {
      method: "DELETE",
    });
    const response = await DELETE(request, makeParams("post-1"));
    expect(response.status).toBe(401);
  });

  it("soft deletes and returns success", async () => {
    mockAuth("user-123");
    vi.mocked(deletePost).mockResolvedValue(undefined);

    const DELETE = await importDELETE();
    const request = new Request("http://localhost:3000/api/posts/post-1", {
      method: "DELETE",
    });
    const response = await DELETE(request, makeParams("post-1"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(deletePost).toHaveBeenCalledWith("user-123", "post-1");
  });

  it("returns 404 when post not found", async () => {
    mockAuth("user-123");
    vi.mocked(deletePost).mockRejectedValue(new Error("Post not found"));

    const DELETE = await importDELETE();
    const request = new Request("http://localhost:3000/api/posts/post-1", {
      method: "DELETE",
    });
    const response = await DELETE(request, makeParams("post-1"));
    expect(response.status).toBe(404);
  });
});
