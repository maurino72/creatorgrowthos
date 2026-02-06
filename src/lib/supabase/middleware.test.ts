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
) {
  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: profile ?? null,
            error: profile
              ? null
              : { code: "PGRST116", message: "Not found" },
          }),
        }),
      }),
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
    mockSupabaseUser({ id: "user-1" }, { onboarded_at: "2024-01-01" });
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
});
