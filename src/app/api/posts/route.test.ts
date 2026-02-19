import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/services/posts", () => ({
  createPost: vi.fn(),
  getPostsForUser: vi.fn(),
}));

vi.mock("@/lib/services/connections", () => ({
  getConnectionByPlatform: vi.fn(),
}));

vi.mock("@/lib/services/usage", () => ({
  canPerformAction: vi.fn().mockResolvedValue({ allowed: true }),
  incrementUsage: vi.fn().mockResolvedValue(undefined),
}));

import { createClient } from "@/lib/supabase/server";
import { createPost, getPostsForUser } from "@/lib/services/posts";
import { getConnectionByPlatform } from "@/lib/services/connections";

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

describe("POST /api/posts", () => {
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
    const request = new Request("http://localhost:3000/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "Hello", platforms: ["twitter"] }),
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid input (empty body)", async () => {
    mockAuth("user-123");
    const POST = await importPOST();
    const request = new Request("http://localhost:3000/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "", platforms: ["twitter"] }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid input (no platforms)", async () => {
    mockAuth("user-123");
    const POST = await importPOST();
    const request = new Request("http://localhost:3000/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "Hello", platforms: [] }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("returns 400 when user has no active connection for platform", async () => {
    mockAuth("user-123");
    vi.mocked(getConnectionByPlatform).mockResolvedValue(null);

    const POST = await importPOST();
    const request = new Request("http://localhost:3000/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "Hello", platforms: ["twitter"] }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("twitter");
  });

  it("creates post and returns 201 for valid input", async () => {
    mockAuth("user-123");
    vi.mocked(getConnectionByPlatform).mockResolvedValue({
      id: "conn-1",
      status: "active",
    } as never);
    const mockPost = {
      id: "post-1",
      body: "Hello world!",
      status: "draft",
    };
    vi.mocked(createPost).mockResolvedValue(mockPost as never);

    const POST = await importPOST();
    const request = new Request("http://localhost:3000/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "Hello world!", platforms: ["twitter"] }),
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.post.id).toBe("post-1");
    expect(createPost).toHaveBeenCalledWith("user-123", {
      body: "Hello world!",
      platforms: ["twitter"],
    });
  });

  it("returns 400 when body exceeds platform-specific char limit (twitter 281 chars)", async () => {
    mockAuth("user-123");
    vi.mocked(getConnectionByPlatform).mockResolvedValue({
      id: "conn-1",
      status: "active",
    } as never);

    const POST = await importPOST();
    const request = new Request("http://localhost:3000/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: "a".repeat(281),
        platforms: ["twitter"],
      }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("character limit");
  });

  it("allows 281-char body for linkedin-only post", async () => {
    mockAuth("user-123");
    vi.mocked(getConnectionByPlatform).mockResolvedValue({
      id: "conn-1",
      status: "active",
    } as never);
    vi.mocked(createPost).mockResolvedValue({
      id: "post-li",
      body: "a".repeat(281),
      status: "draft",
    } as never);

    const POST = await importPOST();
    const request = new Request("http://localhost:3000/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: "a".repeat(281),
        platforms: ["linkedin"],
      }),
    });
    const response = await POST(request);
    expect(response.status).toBe(201);
  });

  it("returns 400 when body exceeds 3000 chars for linkedin", async () => {
    mockAuth("user-123");

    const POST = await importPOST();
    const request = new Request("http://localhost:3000/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: "a".repeat(3001),
        platforms: ["linkedin"],
      }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("creates scheduled post when scheduled_at provided", async () => {
    mockAuth("user-123");
    vi.mocked(getConnectionByPlatform).mockResolvedValue({
      id: "conn-1",
      status: "active",
    } as never);
    const future = new Date(Date.now() + 3600000).toISOString();
    vi.mocked(createPost).mockResolvedValue({
      id: "post-2",
      status: "scheduled",
      scheduled_at: future,
    } as never);

    const POST = await importPOST();
    const request = new Request("http://localhost:3000/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: "Scheduled!",
        platforms: ["twitter"],
        scheduled_at: future,
      }),
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(createPost).toHaveBeenCalledWith("user-123", {
      body: "Scheduled!",
      platforms: ["twitter"],
      scheduled_at: future,
    });
  });
});

describe("GET /api/posts", () => {
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
    const request = new Request("http://localhost:3000/api/posts");
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("returns posts for authenticated user", async () => {
    mockAuth("user-123");
    const mockPosts = [
      { id: "post-1", body: "Hello", status: "draft" },
      { id: "post-2", body: "World", status: "published" },
    ];
    vi.mocked(getPostsForUser).mockResolvedValue(mockPosts as never);

    const GET = await importGET();
    const request = new Request("http://localhost:3000/api/posts");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.posts).toHaveLength(2);
  });

  it("passes status filter from query params", async () => {
    mockAuth("user-123");
    vi.mocked(getPostsForUser).mockResolvedValue([] as never);

    const GET = await importGET();
    const request = new Request(
      "http://localhost:3000/api/posts?status=draft&limit=10&offset=5",
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(getPostsForUser).toHaveBeenCalledWith("user-123", {
      status: "draft",
      limit: 10,
      offset: 5,
    });
  });

  it("uses defaults when no query params provided", async () => {
    mockAuth("user-123");
    vi.mocked(getPostsForUser).mockResolvedValue([] as never);

    const GET = await importGET();
    const request = new Request("http://localhost:3000/api/posts");
    await GET(request);

    expect(getPostsForUser).toHaveBeenCalledWith("user-123", {
      status: undefined,
      limit: 20,
      offset: 0,
    });
  });
});
