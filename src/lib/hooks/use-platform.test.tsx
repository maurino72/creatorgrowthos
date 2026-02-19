import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const mockGet = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: mockGet,
    toString: () => "",
  }),
}));

vi.mock("@/lib/queries/connections", () => ({
  useConnections: vi.fn(),
}));

import { usePlatform } from "./use-platform";
import { useConnections } from "@/lib/queries/connections";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
  };
}

describe("usePlatform", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null platform when no connections exist", () => {
    vi.mocked(useConnections).mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useConnections>);
    mockGet.mockReturnValue(null);

    const { result } = renderHook(() => usePlatform(), {
      wrapper: createWrapper(),
    });

    expect(result.current.platform).toBeNull();
    expect(result.current.hasConnections).toBe(false);
  });

  it("returns null platform when connections are loading", () => {
    vi.mocked(useConnections).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useConnections>);
    mockGet.mockReturnValue(null);

    const { result } = renderHook(() => usePlatform(), {
      wrapper: createWrapper(),
    });

    expect(result.current.platform).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });

  it("falls back to first active connection when no URL param", () => {
    vi.mocked(useConnections).mockReturnValue({
      data: [
        { id: "1", platform: "twitter", status: "active", platform_username: "alice" },
        { id: "2", platform: "linkedin", status: "active", platform_username: "bob" },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useConnections>);
    mockGet.mockReturnValue(null);

    const { result } = renderHook(() => usePlatform(), {
      wrapper: createWrapper(),
    });

    expect(result.current.platform).toBe("twitter");
    expect(result.current.hasConnections).toBe(true);
  });

  it("respects valid platform URL param", () => {
    vi.mocked(useConnections).mockReturnValue({
      data: [
        { id: "1", platform: "twitter", status: "active", platform_username: "alice" },
        { id: "2", platform: "linkedin", status: "active", platform_username: "bob" },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useConnections>);
    mockGet.mockReturnValue("linkedin");

    const { result } = renderHook(() => usePlatform(), {
      wrapper: createWrapper(),
    });

    expect(result.current.platform).toBe("linkedin");
  });

  it("ignores invalid platform URL param and falls back", () => {
    vi.mocked(useConnections).mockReturnValue({
      data: [
        { id: "1", platform: "twitter", status: "active", platform_username: "alice" },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useConnections>);
    mockGet.mockReturnValue("invalid-platform");

    const { result } = renderHook(() => usePlatform(), {
      wrapper: createWrapper(),
    });

    expect(result.current.platform).toBe("twitter");
  });

  it("filters out non-active connections", () => {
    vi.mocked(useConnections).mockReturnValue({
      data: [
        { id: "1", platform: "twitter", status: "expired", platform_username: "alice" },
        { id: "2", platform: "linkedin", status: "active", platform_username: "bob" },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useConnections>);
    mockGet.mockReturnValue(null);

    const { result } = renderHook(() => usePlatform(), {
      wrapper: createWrapper(),
    });

    expect(result.current.platform).toBe("linkedin");
    expect(result.current.activeConnections).toHaveLength(1);
  });

  it("setPlatform updates shared cache without router.replace", async () => {
    vi.mocked(useConnections).mockReturnValue({
      data: [
        { id: "1", platform: "twitter", status: "active", platform_username: "alice" },
        { id: "2", platform: "linkedin", status: "active", platform_username: "bob" },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useConnections>);
    mockGet.mockReturnValue(null);

    const { result } = renderHook(() => usePlatform(), {
      wrapper: createWrapper(),
    });

    expect(result.current.platform).toBe("twitter");

    act(() => {
      result.current.setPlatform("linkedin");
    });

    await waitFor(() => {
      expect(result.current.platform).toBe("linkedin");
    });
  });

  it("setPlatform does not call router.replace", async () => {
    vi.mocked(useConnections).mockReturnValue({
      data: [
        { id: "1", platform: "twitter", status: "active", platform_username: "alice" },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useConnections>);
    mockGet.mockReturnValue(null);

    const { result } = renderHook(() => usePlatform(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setPlatform("linkedin");
    });

    // No router mock needed — the hook doesn't use useRouter anymore
    // This test ensures no navigation side effects
    await waitFor(() => {
      expect(result.current.platform).toBe("linkedin");
    });
  });

  it("uses URL param for initial value then cache for updates", async () => {
    vi.mocked(useConnections).mockReturnValue({
      data: [
        { id: "1", platform: "twitter", status: "active", platform_username: "alice" },
        { id: "2", platform: "linkedin", status: "active", platform_username: "bob" },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useConnections>);
    mockGet.mockReturnValue("linkedin");

    const { result } = renderHook(() => usePlatform(), {
      wrapper: createWrapper(),
    });

    expect(result.current.platform).toBe("linkedin");

    act(() => {
      result.current.setPlatform("twitter");
    });

    await waitFor(() => {
      expect(result.current.platform).toBe("twitter");
    });
  });

  it("setPlatform in one instance propagates to another sharing the same QueryClient", async () => {
    vi.mocked(useConnections).mockReturnValue({
      data: [
        { id: "1", platform: "twitter", status: "active", platform_username: "alice" },
        { id: "2", platform: "linkedin", status: "active", platform_username: "bob" },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useConnections>);
    mockGet.mockReturnValue(null);

    // Both hooks share the same QueryClient (simulating sidebar + page)
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result: sidebar } = renderHook(() => usePlatform(), { wrapper });
    const { result: page } = renderHook(() => usePlatform(), { wrapper });

    // Both start at first active connection
    expect(sidebar.current.platform).toBe("twitter");
    expect(page.current.platform).toBe("twitter");

    // Sidebar switches to linkedin
    act(() => {
      sidebar.current.setPlatform("linkedin");
    });

    // Page must see the update too (this fails with useState)
    await waitFor(() => {
      expect(sidebar.current.platform).toBe("linkedin");
      expect(page.current.platform).toBe("linkedin");
    });
  });
});
