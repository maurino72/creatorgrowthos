import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/services/import", () => ({
  importTwitterPosts: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { importTwitterPosts } from "@/lib/services/import";

async function importRoute() {
  return await import("./route");
}

function mockAuth(user: { id: string } | null) {
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
  } as never);
}

describe("POST /api/import/twitter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const { POST } = await importRoute();
    const request = new Request("http://localhost/api/import/twitter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: 50 }),
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("imports tweets and returns summary", async () => {
    mockAuth({ id: "user-1" });
    vi.mocked(importTwitterPosts).mockResolvedValue({
      imported_count: 47,
      failed_count: 3,
      message: "Successfully imported 47 posts",
      import_id: "import-1",
    });

    const { POST } = await importRoute();
    const request = new Request("http://localhost/api/import/twitter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: 50 }),
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.imported_count).toBe(47);
    expect(importTwitterPosts).toHaveBeenCalledWith("user-1", 50);
  });

  it("returns 400 for invalid count", async () => {
    mockAuth({ id: "user-1" });

    const { POST } = await importRoute();
    const request = new Request("http://localhost/api/import/twitter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: 999 }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("accepts count of 100", async () => {
    mockAuth({ id: "user-1" });
    vi.mocked(importTwitterPosts).mockResolvedValue({
      imported_count: 100,
      failed_count: 0,
      message: "Success",
      import_id: "import-1",
    });

    const { POST } = await importRoute();
    const request = new Request("http://localhost/api/import/twitter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: 100 }),
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
  });

  it("accepts count of 500", async () => {
    mockAuth({ id: "user-1" });
    vi.mocked(importTwitterPosts).mockResolvedValue({
      imported_count: 500,
      failed_count: 0,
      message: "Success",
      import_id: "import-1",
    });

    const { POST } = await importRoute();
    const request = new Request("http://localhost/api/import/twitter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: 500 }),
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
  });
});
