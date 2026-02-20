import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const mockPush = vi.fn();
const mockPathname = vi.fn(() => "/x/dashboard");
const mockParams = vi.fn<() => Record<string, string>>(() => ({
  platform: "x",
}));

vi.mock("next/navigation", () => ({
  useParams: () => mockParams(),
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname(),
}));

vi.mock("@/lib/queries/connections", () => ({
  useConnections: vi.fn(),
}));

import { usePlatform } from "./use-platform";
import { useConnections } from "@/lib/queries/connections";

function createWrapper(queryClient?: QueryClient) {
  const qc =
    queryClient ??
    new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: qc },
      children,
    );
  };
}

const activeTwitter = {
  id: "1",
  platform: "twitter",
  status: "active",
  platform_username: "alice",
};
const activeLinkedin = {
  id: "2",
  platform: "linkedin",
  status: "active",
  platform_username: "bob",
};

describe("usePlatform", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams.mockReturnValue({ platform: "x" });
    mockPathname.mockReturnValue("/x/dashboard");
  });

  describe("platform page (URL has [platform] param)", () => {
    it("reads platform from URL slug x -> twitter", () => {
      vi.mocked(useConnections).mockReturnValue({
        data: [activeTwitter, activeLinkedin],
        isLoading: false,
      } as unknown as ReturnType<typeof useConnections>);
      mockParams.mockReturnValue({ platform: "x" });

      const { result } = renderHook(() => usePlatform(), {
        wrapper: createWrapper(),
      });

      expect(result.current.platform).toBe("twitter");
      expect(result.current.slug).toBe("x");
    });

    it("reads platform from URL slug linkedin -> linkedin", () => {
      vi.mocked(useConnections).mockReturnValue({
        data: [activeTwitter, activeLinkedin],
        isLoading: false,
      } as unknown as ReturnType<typeof useConnections>);
      mockParams.mockReturnValue({ platform: "linkedin" });

      const { result } = renderHook(() => usePlatform(), {
        wrapper: createWrapper(),
      });

      expect(result.current.platform).toBe("linkedin");
      expect(result.current.slug).toBe("linkedin");
    });

    it("returns null platform for invalid slug", () => {
      vi.mocked(useConnections).mockReturnValue({
        data: [activeTwitter],
        isLoading: false,
      } as unknown as ReturnType<typeof useConnections>);
      mockParams.mockReturnValue({ platform: "invalid" });

      const { result } = renderHook(() => usePlatform(), {
        wrapper: createWrapper(),
      });

      expect(result.current.platform).toBeNull();
      expect(result.current.slug).toBeNull();
    });
  });

  describe("account page (no [platform] param)", () => {
    it("falls back to cached platform", async () => {
      vi.mocked(useConnections).mockReturnValue({
        data: [activeTwitter, activeLinkedin],
        isLoading: false,
      } as unknown as ReturnType<typeof useConnections>);
      mockParams.mockReturnValue({});
      mockPathname.mockReturnValue("/connections");

      const qc = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      qc.setQueryData(["platform", "selected"], "linkedin");

      const { result } = renderHook(() => usePlatform(), {
        wrapper: createWrapper(qc),
      });

      expect(result.current.platform).toBe("linkedin");
      expect(result.current.slug).toBe("linkedin");
    });

    it("falls back to first active connection when no cache", () => {
      vi.mocked(useConnections).mockReturnValue({
        data: [activeTwitter, activeLinkedin],
        isLoading: false,
      } as unknown as ReturnType<typeof useConnections>);
      mockParams.mockReturnValue({});
      mockPathname.mockReturnValue("/settings");

      const { result } = renderHook(() => usePlatform(), {
        wrapper: createWrapper(),
      });

      expect(result.current.platform).toBe("twitter");
      expect(result.current.slug).toBe("x");
    });

    it("returns null when no connections exist", () => {
      vi.mocked(useConnections).mockReturnValue({
        data: [],
        isLoading: false,
      } as unknown as ReturnType<typeof useConnections>);
      mockParams.mockReturnValue({});
      mockPathname.mockReturnValue("/settings");

      const { result } = renderHook(() => usePlatform(), {
        wrapper: createWrapper(),
      });

      expect(result.current.platform).toBeNull();
      expect(result.current.slug).toBeNull();
      expect(result.current.hasConnections).toBe(false);
    });
  });

  describe("setPlatform", () => {
    it("navigates to new slug on platform page", () => {
      vi.mocked(useConnections).mockReturnValue({
        data: [activeTwitter, activeLinkedin],
        isLoading: false,
      } as unknown as ReturnType<typeof useConnections>);
      mockParams.mockReturnValue({ platform: "x" });
      mockPathname.mockReturnValue("/x/dashboard");

      const { result } = renderHook(() => usePlatform(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setPlatform("linkedin");
      });

      expect(mockPush).toHaveBeenCalledWith("/linkedin/dashboard");
    });

    it("replaces slug in nested paths", () => {
      vi.mocked(useConnections).mockReturnValue({
        data: [activeTwitter, activeLinkedin],
        isLoading: false,
      } as unknown as ReturnType<typeof useConnections>);
      mockParams.mockReturnValue({ platform: "x" });
      mockPathname.mockReturnValue("/x/content/new");

      const { result } = renderHook(() => usePlatform(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setPlatform("linkedin");
      });

      expect(mockPush).toHaveBeenCalledWith("/linkedin/content/new");
    });

    it("navigates to dashboard from account page", () => {
      vi.mocked(useConnections).mockReturnValue({
        data: [activeTwitter, activeLinkedin],
        isLoading: false,
      } as unknown as ReturnType<typeof useConnections>);
      mockParams.mockReturnValue({});
      mockPathname.mockReturnValue("/connections");

      const { result } = renderHook(() => usePlatform(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setPlatform("linkedin");
      });

      expect(mockPush).toHaveBeenCalledWith("/linkedin/dashboard");
    });

    it("updates cache so account pages see last-visited platform", () => {
      vi.mocked(useConnections).mockReturnValue({
        data: [activeTwitter, activeLinkedin],
        isLoading: false,
      } as unknown as ReturnType<typeof useConnections>);
      mockParams.mockReturnValue({ platform: "x" });
      mockPathname.mockReturnValue("/x/dashboard");

      const qc = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });

      const { result } = renderHook(() => usePlatform(), {
        wrapper: createWrapper(qc),
      });

      act(() => {
        result.current.setPlatform("linkedin");
      });

      expect(qc.getQueryData(["platform", "selected"])).toBe("linkedin");
    });
  });

  describe("URL platform syncs to cache", () => {
    it("writes URL platform to cache for account page fallback", async () => {
      vi.mocked(useConnections).mockReturnValue({
        data: [activeTwitter, activeLinkedin],
        isLoading: false,
      } as unknown as ReturnType<typeof useConnections>);
      mockParams.mockReturnValue({ platform: "linkedin" });
      mockPathname.mockReturnValue("/linkedin/dashboard");

      const qc = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });

      renderHook(() => usePlatform(), {
        wrapper: createWrapper(qc),
      });

      await waitFor(() => {
        expect(qc.getQueryData(["platform", "selected"])).toBe("linkedin");
      });
    });
  });

  describe("connection state", () => {
    it("returns null platform when connections are loading", () => {
      vi.mocked(useConnections).mockReturnValue({
        data: undefined,
        isLoading: true,
      } as unknown as ReturnType<typeof useConnections>);
      mockParams.mockReturnValue({});
      mockPathname.mockReturnValue("/settings");

      const { result } = renderHook(() => usePlatform(), {
        wrapper: createWrapper(),
      });

      expect(result.current.platform).toBeNull();
      expect(result.current.isLoading).toBe(true);
    });

    it("filters out non-active connections", () => {
      vi.mocked(useConnections).mockReturnValue({
        data: [
          {
            id: "1",
            platform: "twitter",
            status: "expired",
            platform_username: "alice",
          },
          activeLinkedin,
        ],
        isLoading: false,
      } as unknown as ReturnType<typeof useConnections>);
      mockParams.mockReturnValue({});
      mockPathname.mockReturnValue("/settings");

      const { result } = renderHook(() => usePlatform(), {
        wrapper: createWrapper(),
      });

      expect(result.current.platform).toBe("linkedin");
      expect(result.current.activeConnections).toHaveLength(1);
    });

    it("returns hasConnections true when active connections exist", () => {
      vi.mocked(useConnections).mockReturnValue({
        data: [activeTwitter],
        isLoading: false,
      } as unknown as ReturnType<typeof useConnections>);
      mockParams.mockReturnValue({ platform: "x" });

      const { result } = renderHook(() => usePlatform(), {
        wrapper: createWrapper(),
      });

      expect(result.current.hasConnections).toBe(true);
    });
  });

  describe("cross-instance sync via cache", () => {
    it("setPlatform in one instance propagates to another", async () => {
      vi.mocked(useConnections).mockReturnValue({
        data: [activeTwitter, activeLinkedin],
        isLoading: false,
      } as unknown as ReturnType<typeof useConnections>);
      mockParams.mockReturnValue({});
      mockPathname.mockReturnValue("/settings");

      const qc = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      const wrapper = createWrapper(qc);

      const { result: sidebar } = renderHook(() => usePlatform(), { wrapper });
      const { result: page } = renderHook(() => usePlatform(), { wrapper });

      expect(sidebar.current.platform).toBe("twitter");
      expect(page.current.platform).toBe("twitter");

      act(() => {
        sidebar.current.setPlatform("linkedin");
      });

      await waitFor(() => {
        expect(sidebar.current.platform).toBe("linkedin");
        expect(page.current.platform).toBe("linkedin");
      });
    });
  });
});
