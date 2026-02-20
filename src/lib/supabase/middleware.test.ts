import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

const mockRedirect = vi.fn();
const mockNext = vi.fn();

vi.mock("next/server", async () => {
  const actual = await vi.importActual("next/server");
  return {
    ...actual,
    NextResponse: {
      next: (...args: unknown[]) => {
        mockNext(...args);
        return new Response(null, { status: 200 });
      },
      redirect: (url: URL) => {
        mockRedirect(url);
        return new Response(null, {
          status: 307,
          headers: { location: url.toString() },
        });
      },
    },
  };
});

import { createServerClient } from "@supabase/ssr";
import { updateSession } from "./middleware";
import { NextRequest } from "next/server";

function mockRequest(pathname: string) {
  const url = `http://localhost:3000${pathname}`;
  return new NextRequest(new Request(url));
}

function mockSupabaseUser(
  user: { id: string } | null,
  profile?: { onboarded_at: string | null } | null,
  subscription?: { status: string; current_period_end: string | null } | null,
  connections?: Array<{ platform: string }> | null,
) {
  const tableData: Record<string, unknown> = {};

  if (profile !== undefined) {
    tableData["profiles"] = {
      data: profile,
      error: profile ? null : { code: "PGRST116", message: "Not found" },
    };
  }

  if (subscription !== undefined) {
    tableData["subscriptions"] = {
      data: subscription,
      error: subscription
        ? null
        : { code: "PGRST116", message: "Not found" },
    };
  }

  if (connections !== undefined) {
    tableData["connections"] = {
      data: connections ?? [],
      error: null,
    };
  }

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      const result = tableData[table] ?? {
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      };

      // connections uses select().eq().order().limit() chain
      if (table === "connections") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(result),
              }),
            }),
          }),
        };
      }

      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(result),
          }),
        }),
      };
    }),
  };

  vi.mocked(createServerClient).mockReturnValue(supabase as never);
  return supabase;
}

describe("updateSession middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-key");
  });

  describe("unauthenticated access", () => {
    it("redirects unauthenticated users from /x/dashboard to /login", async () => {
      mockSupabaseUser(null);
      const request = mockRequest("/x/dashboard");
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/login");
    });

    it("redirects unauthenticated users from /linkedin/content to /login", async () => {
      mockSupabaseUser(null);
      const request = mockRequest("/linkedin/content");
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/login");
    });

    it("redirects unauthenticated users from /settings to /login", async () => {
      mockSupabaseUser(null);
      const request = mockRequest("/settings");
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/login");
    });

    it("redirects unauthenticated users from /connections to /login", async () => {
      mockSupabaseUser(null);
      const request = mockRequest("/connections");
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/login");
    });

    it("redirects unauthenticated users from /onboarding to /login", async () => {
      mockSupabaseUser(null);
      const request = mockRequest("/onboarding");
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/login");
    });

    it("allows unauthenticated access to public pages", async () => {
      mockSupabaseUser(null);
      const request = mockRequest("/");
      const response = await updateSession(request);

      expect(response.status).toBe(200);
    });
  });

  describe("authenticated login redirect", () => {
    it("redirects authenticated users from /login to /<slug>/dashboard using first connection", async () => {
      mockSupabaseUser(
        { id: "user-1" },
        { onboarded_at: "2024-01-01" },
        undefined,
        [{ platform: "linkedin" }],
      );
      const request = mockRequest("/login");
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/linkedin/dashboard");
    });

    it("redirects to /x/dashboard when no connections exist", async () => {
      mockSupabaseUser(
        { id: "user-1" },
        { onboarded_at: "2024-01-01" },
        undefined,
        [],
      );
      const request = mockRequest("/login");
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/x/dashboard");
    });
  });

  describe("legacy /dashboard/* redirects", () => {
    it("redirects /dashboard to /<slug>/dashboard", async () => {
      mockSupabaseUser(
        { id: "user-1" },
        { onboarded_at: "2024-01-01" },
        { status: "active", current_period_end: new Date(Date.now() + 86400000).toISOString() },
        [{ platform: "twitter" }],
      );
      const request = mockRequest("/dashboard");
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/x/dashboard");
    });

    it("redirects /dashboard/content/new to /<slug>/content/new", async () => {
      mockSupabaseUser(
        { id: "user-1" },
        { onboarded_at: "2024-01-01" },
        { status: "active", current_period_end: new Date(Date.now() + 86400000).toISOString() },
        [{ platform: "linkedin" }],
      );
      const request = mockRequest("/dashboard/content/new");
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/linkedin/content/new");
    });

    it("redirects /dashboard/connections to /connections", async () => {
      mockSupabaseUser(
        { id: "user-1" },
        { onboarded_at: "2024-01-01" },
        { status: "active", current_period_end: new Date(Date.now() + 86400000).toISOString() },
      );
      const request = mockRequest("/dashboard/connections");
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/connections");
    });

    it("redirects /dashboard/settings to /settings", async () => {
      mockSupabaseUser(
        { id: "user-1" },
        { onboarded_at: "2024-01-01" },
        { status: "active", current_period_end: new Date(Date.now() + 86400000).toISOString() },
      );
      const request = mockRequest("/dashboard/settings");
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/settings");
    });

    it("redirects /dashboard/settings/billing to /settings/billing", async () => {
      mockSupabaseUser(
        { id: "user-1" },
        { onboarded_at: "2024-01-01" },
        { status: "active", current_period_end: new Date(Date.now() + 86400000).toISOString() },
      );
      const request = mockRequest("/dashboard/settings/billing");
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/settings/billing");
    });

    it("redirects /dashboard/insights to /<slug>/insights", async () => {
      mockSupabaseUser(
        { id: "user-1" },
        { onboarded_at: "2024-01-01" },
        { status: "active", current_period_end: new Date(Date.now() + 86400000).toISOString() },
        [{ platform: "twitter" }],
      );
      const request = mockRequest("/dashboard/insights");
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/x/insights");
    });

    it("redirects /dashboard/experiments to /<slug>/experiments", async () => {
      mockSupabaseUser(
        { id: "user-1" },
        { onboarded_at: "2024-01-01" },
        { status: "active", current_period_end: new Date(Date.now() + 86400000).toISOString() },
        [{ platform: "twitter" }],
      );
      const request = mockRequest("/dashboard/experiments");
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/x/experiments");
    });
  });

  describe("onboarding flow", () => {
    it("redirects non-onboarded user from /x/dashboard to /onboarding", async () => {
      mockSupabaseUser({ id: "user-1" }, { onboarded_at: null });
      const request = mockRequest("/x/dashboard");
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/onboarding");
    });

    it("redirects non-onboarded user from /settings to /onboarding", async () => {
      mockSupabaseUser({ id: "user-1" }, { onboarded_at: null });
      const request = mockRequest("/settings");
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/onboarding");
    });

    it("allows non-onboarded user to access /onboarding", async () => {
      mockSupabaseUser({ id: "user-1" }, { onboarded_at: null });
      const request = mockRequest("/onboarding");
      const response = await updateSession(request);

      expect(response.status).toBe(200);
    });

    it("redirects onboarded user from /onboarding to /<slug>/dashboard", async () => {
      mockSupabaseUser(
        { id: "user-1" },
        { onboarded_at: "2024-01-01" },
        { status: "active", current_period_end: new Date(Date.now() + 86400000).toISOString() },
        [{ platform: "twitter" }],
      );
      const request = mockRequest("/onboarding");
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/x/dashboard");
    });
  });

  describe("subscription gate", () => {
    it("redirects onboarded user without subscription from /x/dashboard to /pricing", async () => {
      mockSupabaseUser(
        { id: "user-1" },
        { onboarded_at: "2024-01-01" },
        null,
      );

      const request = mockRequest("/x/dashboard");
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/pricing");
    });

    it("redirects from /settings without subscription to /pricing", async () => {
      mockSupabaseUser(
        { id: "user-1" },
        { onboarded_at: "2024-01-01" },
        null,
      );

      const request = mockRequest("/settings");
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/pricing");
    });

    it("allows onboarded user with active subscription to access /x/dashboard", async () => {
      mockSupabaseUser(
        { id: "user-1" },
        { onboarded_at: "2024-01-01" },
        { status: "active", current_period_end: new Date(Date.now() + 86400000).toISOString() },
      );

      const request = mockRequest("/x/dashboard");
      const response = await updateSession(request);

      expect(response.status).toBe(200);
    });

    it("allows onboarded user with trialing subscription to access /linkedin/content", async () => {
      mockSupabaseUser(
        { id: "user-1" },
        { onboarded_at: "2024-01-01" },
        { status: "trialing", current_period_end: new Date(Date.now() + 86400000).toISOString() },
      );

      const request = mockRequest("/linkedin/content");
      const response = await updateSession(request);

      expect(response.status).toBe(200);
    });

    it("allows canceled subscription within period to access /x/dashboard", async () => {
      mockSupabaseUser(
        { id: "user-1" },
        { onboarded_at: "2024-01-01" },
        { status: "canceled", current_period_end: new Date(Date.now() + 86400000).toISOString() },
      );

      const request = mockRequest("/x/dashboard");
      const response = await updateSession(request);

      expect(response.status).toBe(200);
    });

    it("redirects canceled subscription past period end to /pricing", async () => {
      mockSupabaseUser(
        { id: "user-1" },
        { onboarded_at: "2024-01-01" },
        { status: "canceled", current_period_end: new Date(Date.now() - 86400000).toISOString() },
      );

      const request = mockRequest("/x/dashboard");
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/pricing");
    });

    it("redirects unpaid subscription to /pricing", async () => {
      mockSupabaseUser(
        { id: "user-1" },
        { onboarded_at: "2024-01-01" },
        { status: "unpaid", current_period_end: null },
      );

      const request = mockRequest("/x/dashboard");
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/pricing");
    });

    it("allows authenticated user to access /pricing without subscription", async () => {
      mockSupabaseUser(
        { id: "user-1" },
        { onboarded_at: "2024-01-01" },
        null,
      );

      const request = mockRequest("/pricing");
      const response = await updateSession(request);

      expect(response.status).toBe(200);
    });

    it("allows access to /api/billing/ without subscription", async () => {
      mockSupabaseUser(
        { id: "user-1" },
        { onboarded_at: "2024-01-01" },
        null,
      );

      const request = mockRequest("/api/billing/checkout");
      const response = await updateSession(request);

      expect(response.status).toBe(200);
    });

    it("allows access to /api/webhooks/stripe without subscription", async () => {
      mockSupabaseUser(null);

      const request = mockRequest("/api/webhooks/stripe");
      const response = await updateSession(request);

      expect(response.status).toBe(200);
    });

    it("allows past_due subscription to access /connections", async () => {
      mockSupabaseUser(
        { id: "user-1" },
        { onboarded_at: "2024-01-01" },
        { status: "past_due", current_period_end: new Date(Date.now() + 86400000).toISOString() },
      );

      const request = mockRequest("/connections");
      const response = await updateSession(request);

      expect(response.status).toBe(200);
    });

    it("allows checkout return to /x/dashboard without subscription (webhook pending)", async () => {
      mockSupabaseUser(
        { id: "user-1" },
        { onboarded_at: "2024-01-01" },
        null,
      );

      const request = mockRequest("/x/dashboard?checkout=success");
      const response = await updateSession(request);

      expect(response.status).toBe(200);
    });

    it("allows user with active subscription to access /pricing", async () => {
      mockSupabaseUser(
        { id: "user-1" },
        { onboarded_at: "2024-01-01" },
        { status: "active", current_period_end: new Date(Date.now() + 86400000).toISOString() },
      );

      const request = mockRequest("/pricing");
      const response = await updateSession(request);

      expect(response.status).toBe(200);
    });
  });

  describe("API and non-protected routes", () => {
    it("allows non-onboarded user to access API routes", async () => {
      mockSupabaseUser({ id: "user-1" }, { onboarded_at: null });
      const request = mockRequest("/api/onboarding");
      const response = await updateSession(request);

      expect(response.status).toBe(200);
    });
  });
});
