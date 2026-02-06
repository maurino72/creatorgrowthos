import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
});

describe("useInsights", () => {
  it("fetches insights from /api/insights", async () => {
    const mockInsights = [
      { id: "i1", type: "performance_pattern", headline: "Test" },
    ];
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ insights: mockInsights }),
    } as Response);

    const { useInsights } = await import("./insights");
    const { result } = renderHook(() => useInsights(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toEqual(mockInsights);
    expect(global.fetch).toHaveBeenCalledWith("/api/insights?status=active");
  });

  it("passes filter params to URL", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ insights: [] }),
    } as Response);

    const { useInsights } = await import("./insights");
    renderHook(
      () => useInsights({ status: "dismissed", type: "anomaly", limit: 5 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/insights?status=dismissed&type=anomaly&limit=5",
      ),
    );
  });
});

describe("useGenerateInsights", () => {
  it("calls POST /api/insights/generate", async () => {
    const mockInsights = [{ id: "i1" }];
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ insights: mockInsights }),
    } as Response);

    const { useGenerateInsights } = await import("./insights");
    const { result } = renderHook(() => useGenerateInsights(), {
      wrapper: createWrapper(),
    });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(global.fetch).toHaveBeenCalledWith("/api/insights/generate", {
      method: "POST",
    });
  });
});

describe("useDismissInsight", () => {
  it("calls PATCH /api/insights/:id/dismiss", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ insight: { id: "i1", status: "dismissed" } }),
    } as Response);

    const { useDismissInsight } = await import("./insights");
    const { result } = renderHook(() => useDismissInsight(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("i1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(global.fetch).toHaveBeenCalledWith("/api/insights/i1/dismiss", {
      method: "PATCH",
    });
  });
});

describe("useMarkInsightActed", () => {
  it("calls PATCH /api/insights/:id/acted", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ insight: { id: "i1", status: "acted_on" } }),
    } as Response);

    const { useMarkInsightActed } = await import("./insights");
    const { result } = renderHook(() => useMarkInsightActed(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("i1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(global.fetch).toHaveBeenCalledWith("/api/insights/i1/acted", {
      method: "PATCH",
    });
  });
});
