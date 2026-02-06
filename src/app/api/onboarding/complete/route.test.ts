import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/services/profiles", () => ({
  completeOnboarding: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { completeOnboarding } from "@/lib/services/profiles";

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

describe("POST /api/onboarding/complete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const { POST } = await importRoute();
    const request = new Request("http://localhost/api/onboarding/complete", {
      method: "POST",
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("completes onboarding and returns success", async () => {
    mockAuth({ id: "user-1" });
    vi.mocked(completeOnboarding).mockResolvedValue(undefined);

    const { POST } = await importRoute();
    const request = new Request("http://localhost/api/onboarding/complete", {
      method: "POST",
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(completeOnboarding).toHaveBeenCalledWith("user-1");
  });
});
