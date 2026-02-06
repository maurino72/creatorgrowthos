import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useOnboardingState,
  useUpdateOnboardingStep,
  useSaveQuickProfile,
  useCompleteOnboarding,
  useImportTwitter,
  useStarterIdeas,
  onboardingKeys,
} from "./onboarding";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("onboarding query keys", () => {
  it("has correct key structure", () => {
    expect(onboardingKeys.state).toEqual(["onboarding", "state"]);
    expect(onboardingKeys.ideas).toEqual(["onboarding", "ideas"]);
  });
});

describe("useOnboardingState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches onboarding state from API", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({ onboarded_at: null, onboarding_step: "connect" }),
        { status: 200 },
      ),
    );

    const { result } = renderHook(() => useOnboardingState(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      onboarded_at: null,
      onboarding_step: "connect",
    });
  });
});

describe("useUpdateOnboardingStep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls PATCH /api/onboarding with step", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, step: "profile" }), {
        status: 200,
      }),
    );

    const { result } = renderHook(() => useUpdateOnboardingStep(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("profile");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/onboarding",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ step: "profile" }),
      }),
    );
  });
});

describe("useSaveQuickProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls POST /api/onboarding/profile with data", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          profile: {
            primary_niche: "tech_software",
            primary_goal: "build_authority",
            target_audience: "SaaS founders",
          },
        }),
        { status: 200 },
      ),
    );

    const { result } = renderHook(() => useSaveQuickProfile(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      primary_niche: "tech_software",
      primary_goal: "build_authority",
      target_audience: "SaaS founders",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/onboarding/profile",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

describe("useCompleteOnboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls POST /api/onboarding/complete", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );

    const { result } = renderHook(() => useCompleteOnboarding(), {
      wrapper: createWrapper(),
    });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/onboarding/complete",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

describe("useImportTwitter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls POST /api/import/twitter with count", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({ imported_count: 47, failed_count: 3, message: "OK" }),
        { status: 200 },
      ),
    );

    const { result } = renderHook(() => useImportTwitter(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(50);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/import/twitter",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ count: 50 }),
      }),
    );
    expect(result.current.data?.imported_count).toBe(47);
  });
});

describe("useStarterIdeas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls POST /api/onboarding/ideas", async () => {
    const mockIdeas = [
      { idea: "Idea 1", hook: "Hook 1" },
      { idea: "Idea 2", hook: "Hook 2" },
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({ ideas: mockIdeas, preview: mockIdeas }),
        { status: 200 },
      ),
    );

    const { result } = renderHook(() => useStarterIdeas(), {
      wrapper: createWrapper(),
    });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.ideas).toHaveLength(2);
  });
});
