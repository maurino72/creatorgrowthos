import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/services/insights", () => ({
  markInsightActedOn: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { markInsightActedOn } from "@/lib/services/insights";

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

describe("PATCH /api/insights/:id/acted", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const { PATCH } = await importRoute();

    const request = new Request("http://localhost/api/insights/i1/acted", { method: "PATCH" });
    const response = await PATCH(request, { params: Promise.resolve({ id: "i1" }) });

    expect(response.status).toBe(401);
  });

  it("marks insight as acted on", async () => {
    mockAuth({ id: "user-1" });
    const mockInsight = { id: "i1", status: "acted_on" };
    vi.mocked(markInsightActedOn).mockResolvedValue(mockInsight as never);

    const { PATCH } = await importRoute();
    const request = new Request("http://localhost/api/insights/i1/acted", { method: "PATCH" });
    const response = await PATCH(request, { params: Promise.resolve({ id: "i1" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.insight).toEqual(mockInsight);
    expect(markInsightActedOn).toHaveBeenCalledWith("user-1", "i1");
  });

  it("returns 500 on error", async () => {
    mockAuth({ id: "user-1" });
    vi.mocked(markInsightActedOn).mockRejectedValue(new Error("Not found"));

    const { PATCH } = await importRoute();
    const request = new Request("http://localhost/api/insights/i1/acted", { method: "PATCH" });
    const response = await PATCH(request, { params: Promise.resolve({ id: "i1" }) });

    expect(response.status).toBe(500);
  });
});
