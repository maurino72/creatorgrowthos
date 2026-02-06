import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/services/profiles", () => ({
  getOnboardingState: vi.fn(),
  updateOnboardingStep: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import {
  getOnboardingState,
  updateOnboardingStep,
} from "@/lib/services/profiles";

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

describe("GET /api/onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const { GET } = await importRoute();
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns onboarding state", async () => {
    mockAuth({ id: "user-1" });
    vi.mocked(getOnboardingState).mockResolvedValue({
      onboarded_at: null,
      onboarding_step: "connect",
    });

    const { GET } = await importRoute();
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.onboarding_step).toBe("connect");
    expect(body.onboarded_at).toBeNull();
  });
});

describe("PATCH /api/onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth(null);
    const { PATCH } = await importRoute();
    const request = new Request("http://localhost/api/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: "connect" }),
    });
    const response = await PATCH(request);
    expect(response.status).toBe(401);
  });

  it("updates onboarding step", async () => {
    mockAuth({ id: "user-1" });
    vi.mocked(updateOnboardingStep).mockResolvedValue(undefined);

    const { PATCH } = await importRoute();
    const request = new Request("http://localhost/api/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: "profile" }),
    });
    const response = await PATCH(request);

    expect(response.status).toBe(200);
    expect(updateOnboardingStep).toHaveBeenCalledWith("user-1", "profile");
  });

  it("returns 400 for invalid step", async () => {
    mockAuth({ id: "user-1" });

    const { PATCH } = await importRoute();
    const request = new Request("http://localhost/api/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: "invalid" }),
    });
    const response = await PATCH(request);

    expect(response.status).toBe(400);
  });
});
