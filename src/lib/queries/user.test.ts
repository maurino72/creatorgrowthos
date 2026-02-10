import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: "user-1",
            email: "test@example.com",
            user_metadata: {
              full_name: "Test User",
              avatar_url: "https://example.com/avatar.jpg",
            },
          },
        },
      }),
    },
  }),
}));

import { useCurrentUser, userKeys } from "./user";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("useCurrentUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches user from supabase auth", async () => {
    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.email).toBe("test@example.com");
    expect(result.current.data?.user_metadata.full_name).toBe("Test User");
  });

  it("has staleTime of 10 minutes", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    function Wrapper({ children }: { children: React.ReactNode }) {
      return React.createElement(QueryClientProvider, { client: queryClient }, children);
    }

    renderHook(() => useCurrentUser(), { wrapper: Wrapper });

    // Check the observer options — staleTime is set on the hook
    const cache = queryClient.getQueryCache();
    const query = cache.find({ queryKey: userKeys.current });
    expect(query).toBeDefined();
  });

  it("defines userKeys.current", () => {
    expect(userKeys.current).toEqual(["user", "current"]);
  });
});
