import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/services/insights", () => ({
  dismissInsight: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { dismissInsight } from "@/lib/services/insights";

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

describe("PATCH /api/insights/:id/dismiss", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const { PATCH } = await importRoute();

    const request = new Request("http://localhost/api/insights/i1/dismiss", { method: "PATCH" });
    const response = await PATCH(request, { params: Promise.resolve({ id: "i1" }) });

    expect(response.status).toBe(401);
  });

  it("dismisses insight successfully", async () => {
    mockAuth({ id: "user-1" });
    const mockInsight = { id: "i1", status: "dismissed" };
    vi.mocked(dismissInsight).mockResolvedValue(mockInsight);

    const { PATCH } = await importRoute();
    const request = new Request("http://localhost/api/insights/i1/dismiss", { method: "PATCH" });
    const response = await PATCH(request, { params: Promise.resolve({ id: "i1" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.insight).toEqual(mockInsight);
    expect(dismissInsight).toHaveBeenCalledWith("user-1", "i1");
  });

  it("returns 500 on error", async () => {
    mockAuth({ id: "user-1" });
    vi.mocked(dismissInsight).mockRejectedValue(new Error("Not found"));

    const { PATCH } = await importRoute();
    const request = new Request("http://localhost/api/insights/i1/dismiss", { method: "PATCH" });
    const response = await PATCH(request, { params: Promise.resolve({ id: "i1" }) });

    expect(response.status).toBe(500);
  });
});
