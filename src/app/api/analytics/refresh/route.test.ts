import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

// ─── Mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
    },
  }),
}));

vi.mock("@/lib/inngest/client", () => ({
  inngest: {
    send: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/lib/services/metric-snapshots", () => ({
  getApiCallsUsedToday: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";
import { getApiCallsUsedToday } from "@/lib/services/metric-snapshots";

// ─── Helpers ────────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown> = {}) {
  return new Request("http://localhost/api/analytics/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────

describe("POST /api/analytics/refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getApiCallsUsedToday).mockResolvedValue(10);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as never);

    const res = await POST(makeRequest({ platform: "linkedin" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when platform is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid platform", async () => {
    const res = await POST(makeRequest({ platform: "instagram" }));
    expect(res.status).toBe(400);
  });

  it("triggers metrics refresh for linkedin", async () => {
    const res = await POST(makeRequest({ platform: "linkedin" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toContain("refresh");
    expect(inngest.send).toHaveBeenCalled();
  });

  it("triggers metrics refresh for twitter", async () => {
    const res = await POST(makeRequest({ platform: "twitter" }));

    expect(res.status).toBe(200);
    expect(inngest.send).toHaveBeenCalled();
  });

  it("returns 429 when daily API limit reached", async () => {
    vi.mocked(getApiCallsUsedToday).mockResolvedValue(500);

    const res = await POST(makeRequest({ platform: "linkedin" }));
    expect(res.status).toBe(429);
  });

  it("returns api calls used today in response", async () => {
    const res = await POST(makeRequest({ platform: "linkedin" }));
    const json = await res.json();

    expect(json.api_calls_today).toBe(10);
  });
});
