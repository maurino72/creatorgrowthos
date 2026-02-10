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

    result.current.mutate(undefined);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(global.fetch).toHaveBeenCalledWith("/api/insights/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: undefined }),
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

  it("optimistically sets insight status to dismissed", async () => {
    const { QueryClient: QC, QueryClientProvider: QCP } = await import("@tanstack/react-query");
    const { insightKeys, useDismissInsight } = await import("./insights");

    const queryClient = new QC({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const insights = [
      { id: "i1", status: "active", headline: "Test" },
      { id: "i2", status: "active", headline: "Other" },
    ];
    queryClient.setQueryData(insightKeys.all, insights);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ insight: { id: "i1", status: "dismissed" } }),
    } as Response);

    function Wrapper({ children }: { children: React.ReactNode }) {
      return React.createElement(QCP, { client: queryClient }, children);
    }

    const { result } = renderHook(() => useDismissInsight(), { wrapper: Wrapper });
    result.current.mutate("i1");

    await waitFor(() => {
      const cached = queryClient.getQueryData(insightKeys.all) as typeof insights;
      expect(cached?.find((i) => i.id === "i1")?.status).toBe("dismissed");
    });
  });

  it("rolls back on error", async () => {
    const { QueryClient: QC, QueryClientProvider: QCP } = await import("@tanstack/react-query");
    const { insightKeys, useDismissInsight } = await import("./insights");

    const queryClient = new QC({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const insights = [{ id: "i1", status: "active", headline: "Test" }];
    queryClient.setQueryData(insightKeys.all, insights);

    vi.mocked(global.fetch).mockResolvedValue({ ok: false } as Response);

    function Wrapper({ children }: { children: React.ReactNode }) {
      return React.createElement(QCP, { client: queryClient }, children);
    }

    const { result } = renderHook(() => useDismissInsight(), { wrapper: Wrapper });
    result.current.mutate("i1");

    await waitFor(() => expect(result.current.isError).toBe(true));
    const cached = queryClient.getQueryData(insightKeys.all) as typeof insights;
    expect(cached?.[0]?.status).toBe("active");
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

  it("optimistically sets insight status to acted_on", async () => {
    const { QueryClient: QC, QueryClientProvider: QCP } = await import("@tanstack/react-query");
    const { insightKeys, useMarkInsightActed } = await import("./insights");

    const queryClient = new QC({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const insights = [{ id: "i1", status: "active", headline: "Test" }];
    queryClient.setQueryData(insightKeys.all, insights);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ insight: { id: "i1", status: "acted_on" } }),
    } as Response);

    function Wrapper({ children }: { children: React.ReactNode }) {
      return React.createElement(QCP, { client: queryClient }, children);
    }

    const { result } = renderHook(() => useMarkInsightActed(), { wrapper: Wrapper });
    result.current.mutate("i1");

    await waitFor(() => {
      const cached = queryClient.getQueryData(insightKeys.all) as typeof insights;
      expect(cached?.find((i) => i.id === "i1")?.status).toBe("acted_on");
    });
  });
});
