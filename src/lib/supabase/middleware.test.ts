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

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      const result = tableData[table] ?? {
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      };
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

  it("redirects unauthenticated users from /dashboard to /login", async () => {
    mockSupabaseUser(null);
    const request = mockRequest("/dashboard");
    const response = await updateSession(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("redirects authenticated users from /login to /dashboard", async () => {
    mockSupabaseUser({ id: "user-1" }, { onboarded_at: "2024-01-01" });
    const request = mockRequest("/login");
    const response = await updateSession(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/dashboard");
  });

  it("redirects non-onboarded user from /dashboard to /onboarding", async () => {
    mockSupabaseUser({ id: "user-1" }, { onboarded_at: null });
    const request = mockRequest("/dashboard");
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

  it("redirects onboarded user from /onboarding to /dashboard", async () => {
    mockSupabaseUser(
      { id: "user-1" },
      { onboarded_at: "2024-01-01" },
      { status: "active", current_period_end: new Date(Date.now() + 86400000).toISOString() },
    );
    const request = mockRequest("/onboarding");
    const response = await updateSession(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/dashboard");
  });

  it("allows non-onboarded user to access API routes", async () => {
    mockSupabaseUser({ id: "user-1" }, { onboarded_at: null });
    const request = mockRequest("/api/onboarding");
    const response = await updateSession(request);

    expect(response.status).toBe(200);
  });

  it("allows unauthenticated access to public pages", async () => {
    mockSupabaseUser(null);
    const request = mockRequest("/");
    const response = await updateSession(request);

    expect(response.status).toBe(200);
  });

  // Subscription gate tests
  describe("subscription gate", () => {
    it("redirects onboarded user without subscription from /dashboard to /pricing", async () => {
      mockSupabaseUser(
        { id: "user-1" },
        { onboarded_at: "2024-01-01" },
        null,
      );

      const request = mockRequest("/dashboard");
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/pricing");
    });

    it("allows onboarded user with active subscription to access /dashboard", async () => {
      mockSupabaseUser(
        { id: "user-1" },
        { onboarded_at: "2024-01-01" },
        { status: "active", current_period_end: new Date(Date.now() + 86400000).toISOString() },
      );

      const request = mockRequest("/dashboard");
      const response = await updateSession(request);

      expect(response.status).toBe(200);
    });

    it("allows onboarded user with trialing subscription to access /dashboard", async () => {
      mockSupabaseUser(
        { id: "user-1" },
        { onboarded_at: "2024-01-01" },
        { status: "trialing", current_period_end: new Date(Date.now() + 86400000).toISOString() },
      );

      const request = mockRequest("/dashboard");
      const response = await updateSession(request);

      expect(response.status).toBe(200);
    });

    it("allows canceled subscription within period to access /dashboard", async () => {
      mockSupabaseUser(
        { id: "user-1" },
        { onboarded_at: "2024-01-01" },
        { status: "canceled", current_period_end: new Date(Date.now() + 86400000).toISOString() },
      );

      const request = mockRequest("/dashboard");
      const response = await updateSession(request);

      expect(response.status).toBe(200);
    });

    it("redirects canceled subscription past period end to /pricing", async () => {
      mockSupabaseUser(
        { id: "user-1" },
        { onboarded_at: "2024-01-01" },
        { status: "canceled", current_period_end: new Date(Date.now() - 86400000).toISOString() },
      );

      const request = mockRequest("/dashboard");
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

      const request = mockRequest("/dashboard");
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

    it("allows past_due subscription to access /dashboard (grace period)", async () => {
      mockSupabaseUser(
        { id: "user-1" },
        { onboarded_at: "2024-01-01" },
        { status: "past_due", current_period_end: new Date(Date.now() + 86400000).toISOString() },
      );

      const request = mockRequest("/dashboard");
      const response = await updateSession(request);

      expect(response.status).toBe(200);
    });

    it("allows checkout return to /dashboard without subscription (webhook pending)", async () => {
      mockSupabaseUser(
        { id: "user-1" },
        { onboarded_at: "2024-01-01" },
        null,
      );

      const request = mockRequest("/dashboard?checkout=success");
      const response = await updateSession(request);

      expect(response.status).toBe(200);
    });

    it("redirects user with active subscription from /pricing to /dashboard", async () => {
      mockSupabaseUser(
        { id: "user-1" },
        { onboarded_at: "2024-01-01" },
        { status: "active", current_period_end: new Date(Date.now() + 86400000).toISOString() },
      );

      const request = mockRequest("/pricing");
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/dashboard");
    });
  });
});
