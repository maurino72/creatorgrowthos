import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/services/experiments", () => ({
  getExperimentsForUser: vi.fn(),
  suggestExperiments: vi.fn(),
  InsufficientDataError: class InsufficientDataError extends Error {
    constructor(count: number) {
      super(`Insufficient data: ${count} published posts, minimum 15 required`);
      this.name = "InsufficientDataError";
    }
  },
}));

import { createClient } from "@/lib/supabase/server";
import { getExperimentsForUser, suggestExperiments, InsufficientDataError } from "@/lib/services/experiments";

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

describe("GET /api/experiments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const { GET } = await importRoute();
    const req = new Request("http://localhost/api/experiments");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns experiments list", async () => {
    mockAuth({ id: "user-1" });
    vi.mocked(getExperimentsForUser).mockResolvedValue([
      { id: "exp-1", type: "format_test", status: "suggested" },
    ]);
    const { GET } = await importRoute();
    const req = new Request("http://localhost/api/experiments");
    const res = await GET(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.experiments).toHaveLength(1);
  });
});

describe("POST /api/experiments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const { POST } = await importRoute();
    const req = new Request("http://localhost/api/experiments", { method: "POST" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns suggested experiments on success", async () => {
    mockAuth({ id: "user-1" });
    vi.mocked(suggestExperiments).mockResolvedValue([
      { id: "exp-1", type: "format_test", status: "suggested" },
    ]);
    const { POST } = await importRoute();
    const req = new Request("http://localhost/api/experiments", { method: "POST" });
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.experiments).toHaveLength(1);
  });

  it("returns 400 when insufficient data", async () => {
    mockAuth({ id: "user-1" });
    vi.mocked(suggestExperiments).mockRejectedValue(new InsufficientDataError(5));
    const { POST } = await importRoute();
    const req = new Request("http://localhost/api/experiments", { method: "POST" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
