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

describe("useExperiments", () => {
  it("fetches experiments from /api/experiments", async () => {
    const mockExperiments = [
      { id: "exp-1", type: "format_test", status: "suggested" },
    ];
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ experiments: mockExperiments }),
    } as Response);

    const { useExperiments } = await import("./experiments");
    const { result } = renderHook(() => useExperiments(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toEqual(mockExperiments);
    expect(global.fetch).toHaveBeenCalledWith("/api/experiments?");
  });

  it("passes status filter to URL", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ experiments: [] }),
    } as Response);

    const { useExperiments } = await import("./experiments");
    renderHook(() => useExperiments({ status: "accepted" }), {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/experiments?status=accepted",
      ),
    );
  });
});

describe("useSuggestExperiments", () => {
  it("calls POST /api/experiments", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ experiments: [{ id: "exp-1" }] }),
    } as Response);

    const { useSuggestExperiments } = await import("./experiments");
    const { result } = renderHook(() => useSuggestExperiments(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(undefined);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(global.fetch).toHaveBeenCalledWith("/api/experiments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: undefined }),
    });
  });
});

describe("useAcceptExperiment", () => {
  it("calls PATCH /api/experiments/:id/accept", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ experiment: { id: "exp-1", status: "accepted" } }),
    } as Response);

    const { useAcceptExperiment } = await import("./experiments");
    const { result } = renderHook(() => useAcceptExperiment(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("exp-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/experiments/exp-1/accept",
      { method: "PATCH" },
    );
  });

  it("optimistically sets experiment status to accepted", async () => {
    const { QueryClient: QC, QueryClientProvider: QCP } = await import("@tanstack/react-query");
    const { experimentKeys, useAcceptExperiment } = await import("./experiments");

    const queryClient = new QC({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const experiments = [
      { id: "exp-1", status: "suggested", hypothesis: "Test" },
      { id: "exp-2", status: "suggested", hypothesis: "Other" },
    ];
    queryClient.setQueryData(experimentKeys.all, experiments);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ experiment: { id: "exp-1", status: "accepted" } }),
    } as Response);

    function Wrapper({ children }: { children: React.ReactNode }) {
      return React.createElement(QCP, { client: queryClient }, children);
    }

    const { result } = renderHook(() => useAcceptExperiment(), { wrapper: Wrapper });
    result.current.mutate("exp-1");

    await waitFor(() => {
      const cached = queryClient.getQueryData(experimentKeys.all) as typeof experiments;
      expect(cached?.find((e) => e.id === "exp-1")?.status).toBe("accepted");
    });
  });
});

describe("useDismissExperiment", () => {
  it("calls PATCH /api/experiments/:id/dismiss", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ experiment: { id: "exp-1", status: "dismissed" } }),
    } as Response);

    const { useDismissExperiment } = await import("./experiments");
    const { result } = renderHook(() => useDismissExperiment(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("exp-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/experiments/exp-1/dismiss",
      { method: "PATCH" },
    );
  });

  it("optimistically sets experiment status to dismissed", async () => {
    const { QueryClient: QC, QueryClientProvider: QCP } = await import("@tanstack/react-query");
    const { experimentKeys, useDismissExperiment } = await import("./experiments");

    const queryClient = new QC({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const experiments = [{ id: "exp-1", status: "suggested", hypothesis: "Test" }];
    queryClient.setQueryData(experimentKeys.all, experiments);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ experiment: { id: "exp-1", status: "dismissed" } }),
    } as Response);

    function Wrapper({ children }: { children: React.ReactNode }) {
      return React.createElement(QCP, { client: queryClient }, children);
    }

    const { result } = renderHook(() => useDismissExperiment(), { wrapper: Wrapper });
    result.current.mutate("exp-1");

    await waitFor(() => {
      const cached = queryClient.getQueryData(experimentKeys.all) as typeof experiments;
      expect(cached?.find((e) => e.id === "exp-1")?.status).toBe("dismissed");
    });
  });

  it("rolls back on error", async () => {
    const { QueryClient: QC, QueryClientProvider: QCP } = await import("@tanstack/react-query");
    const { experimentKeys, useDismissExperiment } = await import("./experiments");

    const queryClient = new QC({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const experiments = [{ id: "exp-1", status: "suggested", hypothesis: "Test" }];
    queryClient.setQueryData(experimentKeys.all, experiments);

    vi.mocked(global.fetch).mockResolvedValue({ ok: false } as Response);

    function Wrapper({ children }: { children: React.ReactNode }) {
      return React.createElement(QCP, { client: queryClient }, children);
    }

    const { result } = renderHook(() => useDismissExperiment(), { wrapper: Wrapper });
    result.current.mutate("exp-1");

    await waitFor(() => expect(result.current.isError).toBe(true));
    const cached = queryClient.getQueryData(experimentKeys.all) as typeof experiments;
    expect(cached?.[0]?.status).toBe("suggested");
  });
});
