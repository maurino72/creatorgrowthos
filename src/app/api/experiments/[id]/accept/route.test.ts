import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/services/experiments", () => ({
  acceptExperiment: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { acceptExperiment } from "@/lib/services/experiments";

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

describe("PATCH /api/experiments/:id/accept", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const { PATCH } = await importRoute();
    const req = new Request("http://localhost/api/experiments/exp-1/accept", { method: "PATCH" });
    const res = await PATCH(req, { params: Promise.resolve({ id: "exp-1" }) });
    expect(res.status).toBe(401);
  });

  it("accepts experiment successfully", async () => {
    mockAuth({ id: "user-1" });
    vi.mocked(acceptExperiment).mockResolvedValue({ id: "exp-1", status: "accepted" } as never);
    const { PATCH } = await importRoute();
    const req = new Request("http://localhost/api/experiments/exp-1/accept", { method: "PATCH" });
    const res = await PATCH(req, { params: Promise.resolve({ id: "exp-1" }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.experiment.status).toBe("accepted");
  });

  it("returns 500 on error", async () => {
    mockAuth({ id: "user-1" });
    vi.mocked(acceptExperiment).mockRejectedValue(new Error("DB error"));
    const { PATCH } = await importRoute();
    const req = new Request("http://localhost/api/experiments/exp-1/accept", { method: "PATCH" });
    const res = await PATCH(req, { params: Promise.resolve({ id: "exp-1" }) });
    expect(res.status).toBe(500);
  });
});
