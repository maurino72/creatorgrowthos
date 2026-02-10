import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useConnections, useDisconnect, connectionKeys } from "./connections";

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

describe("connection query keys", () => {
  it("has correct key structure", () => {
    expect(connectionKeys.all).toEqual(["connections"]);
    expect(connectionKeys.byPlatform("twitter")).toEqual([
      "connections",
      "twitter",
    ]);
  });
});

describe("useConnections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches connections from API", async () => {
    const mockConnections = [
      { id: "conn-1", platform: "twitter", status: "active" },
    ];

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ connections: mockConnections }), {
        status: 200,
      }),
    );

    const { result } = renderHook(() => useConnections(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockConnections);
  });

  it("handles API error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    );

    const { result } = renderHook(() => useConnections(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useDisconnect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends DELETE request and invalidates queries", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );

    const { result } = renderHook(() => useDisconnect(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("twitter");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/connections/twitter",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("optimistically removes connection from cache", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const connections = [
      { id: "c1", platform: "twitter", status: "active" },
      { id: "c2", platform: "linkedin", status: "active" },
    ];
    queryClient.setQueryData(connectionKeys.all, connections);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );

    const { result } = renderHook(() => useDisconnect(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });
    result.current.mutate("twitter");

    await waitFor(() => {
      const cached = queryClient.getQueryData(connectionKeys.all) as typeof connections;
      expect(cached).toHaveLength(1);
      expect(cached[0].platform).toBe("linkedin");
    });
  });

  it("rolls back on disconnect error", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const connections = [
      { id: "c1", platform: "twitter", status: "active" },
    ];
    queryClient.setQueryData(connectionKeys.all, connections);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "fail" }), { status: 500 }),
    );

    const { result } = renderHook(() => useDisconnect(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });
    result.current.mutate("twitter");

    await waitFor(() => expect(result.current.isError).toBe(true));
    const cached = queryClient.getQueryData(connectionKeys.all) as typeof connections;
    expect(cached).toHaveLength(1);
  });
});
