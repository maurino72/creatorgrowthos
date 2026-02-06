import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/services/insights", () => ({
  getEligibleUsersForInsights: vi.fn(),
  generateInsights: vi.fn(),
}));

import { getEligibleUsersForInsights, generateInsights } from "@/lib/services/insights";

async function importRoute() {
  const mod = await import("./route");
  return mod;
}

describe("POST /api/jobs/generate-insights", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-secret";
  });

  it("returns 401 without valid authorization", async () => {
    const { POST } = await importRoute();

    const request = new Request("http://localhost/api/jobs/generate-insights", {
      method: "POST",
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it("returns 401 with wrong secret", async () => {
    const { POST } = await importRoute();

    const request = new Request("http://localhost/api/jobs/generate-insights", {
      method: "POST",
      headers: { Authorization: "Bearer wrong-secret" },
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it("generates insights for eligible users", async () => {
    vi.mocked(getEligibleUsersForInsights).mockResolvedValue(["user-1", "user-2"]);
    vi.mocked(generateInsights).mockResolvedValue([
      { id: "i1", type: "performance_pattern", headline: "Test" },
    ] as never);

    const { POST } = await importRoute();
    const request = new Request("http://localhost/api/jobs/generate-insights", {
      method: "POST",
      headers: { Authorization: "Bearer test-secret" },
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.processed).toBe(2);
    expect(body.failed).toBe(0);
  });

  it("continues processing when individual user fails", async () => {
    vi.mocked(getEligibleUsersForInsights).mockResolvedValue(["user-1", "user-2", "user-3"]);
    vi.mocked(generateInsights)
      .mockResolvedValueOnce([{ id: "i1" }] as never)
      .mockRejectedValueOnce(new Error("AI error"))
      .mockResolvedValueOnce([{ id: "i2" }] as never);

    const { POST } = await importRoute();
    const request = new Request("http://localhost/api/jobs/generate-insights", {
      method: "POST",
      headers: { Authorization: "Bearer test-secret" },
    });
    const response = await POST(request);
    const body = await response.json();

    expect(body.processed).toBe(2);
    expect(body.failed).toBe(1);
    expect(body.errors).toHaveLength(1);
  });

  it("handles empty eligible users list", async () => {
    vi.mocked(getEligibleUsersForInsights).mockResolvedValue([]);

    const { POST } = await importRoute();
    const request = new Request("http://localhost/api/jobs/generate-insights", {
      method: "POST",
      headers: { Authorization: "Bearer test-secret" },
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.processed).toBe(0);
    expect(body.failed).toBe(0);
  });
});
