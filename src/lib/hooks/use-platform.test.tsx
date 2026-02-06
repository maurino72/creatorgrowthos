import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const mockReplace = vi.fn();
const mockGet = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: mockGet,
    toString: () => "",
  }),
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/dashboard",
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

  it("setPlatform updates URL via router.replace", () => {
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

    expect(mockReplace).toHaveBeenCalledWith("/dashboard?platform=linkedin");
  });
});
