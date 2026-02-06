import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/services/connections", () => ({
  getConnectionsForUser: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { getConnectionsForUser } from "@/lib/services/connections";

describe("GET /api/connections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function importGET() {
    const mod = await import("./route");
    return mod.GET;
  }

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

  it("returns 401 for unauthenticated user", async () => {
    mockAuth(null);
    const GET = await importGET();
    const request = new Request("http://localhost:3000/api/connections");
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it("returns connections array for authenticated user", async () => {
    mockAuth("user-123");
    const mockConnections = [
      {
        id: "conn-1",
        platform: "twitter",
        platform_username: "testuser",
        status: "active",
        connected_at: "2024-01-01",
      },
    ];
    vi.mocked(getConnectionsForUser).mockResolvedValue(mockConnections as never);

    const GET = await importGET();
    const request = new Request("http://localhost:3000/api/connections");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.connections).toHaveLength(1);
    expect(body.connections[0].platform).toBe("twitter");
  });

  it("returns empty array when no connections", async () => {
    mockAuth("user-123");
    vi.mocked(getConnectionsForUser).mockResolvedValue([]);

    const GET = await importGET();
    const request = new Request("http://localhost:3000/api/connections");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.connections).toEqual([]);
  });

  it("never includes tokens in response", async () => {
    mockAuth("user-123");
    vi.mocked(getConnectionsForUser).mockResolvedValue([
      {
        id: "conn-1",
        platform: "twitter",
        platform_username: "testuser",
        status: "active",
      },
    ] as never);

    const GET = await importGET();
    const request = new Request("http://localhost:3000/api/connections");
    const response = await GET(request);

    const body = await response.json();
    const conn = body.connections[0];
    expect(conn).not.toHaveProperty("access_token_enc");
    expect(conn).not.toHaveProperty("refresh_token_enc");
  });
});
