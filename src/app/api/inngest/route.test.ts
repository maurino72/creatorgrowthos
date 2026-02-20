import { describe, it, expect } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { vi } from "vitest";

describe("/api/inngest route", () => {
  it("exports GET, POST, and PUT handlers", async () => {
    const route = await import("./route");
    expect(typeof route.GET).toBe("function");
    expect(typeof route.POST).toBe("function");
    expect(typeof route.PUT).toBe("function");
  });

  it("registers all 16 Inngest functions", async () => {
    const functions = await import("@/lib/inngest/functions");
    const exports = Object.keys(functions);
    expect(exports).toHaveLength(16);
    expect(exports).toEqual(
      expect.arrayContaining([
        "publishScheduledPost",
        "startMetricsCollection",
        "collectMetrics",
        "fetchMetrics",
        "classifyPostFn",
        "classifyImportedPosts",
        "checkExpiringTokens",
        "refreshToken",
        "generateWeeklyInsights",
        "generateUserInsights",
        "cleanupOrphanMedia",
        "collectLinkedInMetrics",
        "collectTwitterMetrics",
        "fetchLinkedInFollowers",
        "fetchTwitterFollowers",
        "cleanupStaleMetrics",
      ]),
    );
  });
});
