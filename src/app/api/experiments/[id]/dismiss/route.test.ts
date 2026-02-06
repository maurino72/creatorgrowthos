import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/services/experiments", () => ({
  dismissExperiment: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { dismissExperiment } from "@/lib/services/experiments";

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

describe("PATCH /api/experiments/:id/dismiss", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const { PATCH } = await importRoute();
    const req = new Request("http://localhost/api/experiments/exp-1/dismiss", { method: "PATCH" });
    const res = await PATCH(req, { params: Promise.resolve({ id: "exp-1" }) });
    expect(res.status).toBe(401);
  });

  it("dismisses experiment successfully", async () => {
    mockAuth({ id: "user-1" });
    vi.mocked(dismissExperiment).mockResolvedValue({ id: "exp-1", status: "dismissed" } as never);
    const { PATCH } = await importRoute();
    const req = new Request("http://localhost/api/experiments/exp-1/dismiss", { method: "PATCH" });
    const res = await PATCH(req, { params: Promise.resolve({ id: "exp-1" }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.experiment.status).toBe("dismissed");
  });

  it("returns 500 on error", async () => {
    mockAuth({ id: "user-1" });
    vi.mocked(dismissExperiment).mockRejectedValue(new Error("DB error"));
    const { PATCH } = await importRoute();
    const req = new Request("http://localhost/api/experiments/exp-1/dismiss", { method: "PATCH" });
    const res = await PATCH(req, { params: Promise.resolve({ id: "exp-1" }) });
    expect(res.status).toBe(500);
  });
});
