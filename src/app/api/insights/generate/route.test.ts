import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/services/insights", () => ({
  generateInsights: vi.fn(),
  InsufficientDataError: class InsufficientDataError extends Error {
    constructor(count: number) {
      super(`Insufficient data: ${count} published posts, minimum 20 required`);
      this.name = "InsufficientDataError";
    }
  },
}));

import { createClient } from "@/lib/supabase/server";
import { generateInsights, InsufficientDataError } from "@/lib/services/insights";

async function importRoute() {
  const mod = await import("./route");
  return mod;
}

function mockAuth(user: { id: string } | null) {
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
      }),
    },
  } as never);
}

describe("POST /api/insights/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const { POST } = await importRoute();

    const request = new Request("http://localhost/api/insights/generate", { method: "POST" });
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it("returns generated insights on success", async () => {
    mockAuth({ id: "user-1" });
    const mockInsights = [
      { id: "i1", type: "performance_pattern", headline: "Test insight" },
      { id: "i2", type: "opportunity", headline: "Another insight" },
      { id: "i3", type: "anomaly", headline: "Third insight" },
    ];
    vi.mocked(generateInsights).mockResolvedValue(mockInsights as never);

    const { POST } = await importRoute();
    const request = new Request("http://localhost/api/insights/generate", { method: "POST" });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.insights).toEqual(mockInsights);
  });

  it("returns 400 when insufficient data", async () => {
    mockAuth({ id: "user-1" });
    vi.mocked(generateInsights).mockRejectedValue(
      new InsufficientDataError(10),
    );

    const { POST } = await importRoute();
    const request = new Request("http://localhost/api/insights/generate", { method: "POST" });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("Insufficient data");
  });

  it("returns 500 on unexpected error", async () => {
    mockAuth({ id: "user-1" });
    vi.mocked(generateInsights).mockRejectedValue(new Error("OpenAI down"));

    const { POST } = await importRoute();
    const request = new Request("http://localhost/api/insights/generate", { method: "POST" });
    const response = await POST(request);

    expect(response.status).toBe(500);
  });
});
