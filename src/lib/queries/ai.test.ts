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

describe("useGenerateIdeas", () => {
  it("calls POST /api/ai/ideas", async () => {
    const mockIdeas = [
      { headline: "Idea 1", format: "thread" },
    ];
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ ideas: mockIdeas }),
    } as Response);

    const { useGenerateIdeas } = await import("./ai");
    const { result } = renderHook(() => useGenerateIdeas(), {
      wrapper: createWrapper(),
    });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(global.fetch).toHaveBeenCalledWith("/api/ai/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    expect(result.current.data).toEqual(mockIdeas);
  });

  it("throws on error response", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Insufficient data" }),
    } as Response);

    const { useGenerateIdeas } = await import("./ai");
    const { result } = renderHook(() => useGenerateIdeas(), {
      wrapper: createWrapper(),
    });

    result.current.mutate();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain("Insufficient data");
  });
});

describe("useSuggestHashtags", () => {
  it("calls POST /api/ai/hashtags with content", async () => {
    const mockSuggestions = [
      { tag: "react", relevance: "high" },
      { tag: "nextjs", relevance: "medium" },
      { tag: "webdev", relevance: "low" },
    ];
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ suggestions: mockSuggestions }),
    } as Response);

    const { useSuggestHashtags } = await import("./ai");
    const { result } = renderHook(() => useSuggestHashtags(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("Building with React and Next.js");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(global.fetch).toHaveBeenCalledWith("/api/ai/hashtags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Building with React and Next.js" }),
    });
    expect(result.current.data).toEqual(mockSuggestions);
  });

  it("throws on error response", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Content is required" }),
    } as Response);

    const { useSuggestHashtags } = await import("./ai");
    const { result } = renderHook(() => useSuggestHashtags(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("");

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain("Content is required");
  });
});

describe("useImproveContent", () => {
  it("calls POST /api/ai/improve with content", async () => {
    const mockResult = {
      overall_assessment: "Good draft",
      improvements: [{ type: "hook", suggestion: "Better hook", example: "Try:" }],
    };
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ result: mockResult }),
    } as Response);

    const { useImproveContent } = await import("./ai");
    const { result } = renderHook(() => useImproveContent(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("My draft post");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(global.fetch).toHaveBeenCalledWith("/api/ai/improve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "My draft post" }),
    });
    expect(result.current.data).toEqual(mockResult);
  });
});
