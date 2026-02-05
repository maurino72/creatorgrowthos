import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  usePosts,
  usePost,
  useCreatePost,
  useUpdatePost,
  useDeletePost,
  usePublishPost,
  useClassifyPost,
  useUpdateClassifications,
  postKeys,
} from "./posts";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
  };
}

describe("postKeys", () => {
  it("defines all key", () => {
    expect(postKeys.all).toEqual(["posts"]);
  });

  it("defines list key with filters", () => {
    expect(postKeys.list({ status: "draft" })).toEqual([
      "posts",
      "list",
      { status: "draft" },
    ]);
  });

  it("defines detail key", () => {
    expect(postKeys.detail("post-1")).toEqual(["posts", "detail", "post-1"]);
  });
});

describe("usePosts", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches posts from API", async () => {
    const mockPosts = [{ id: "post-1", body: "Hello", status: "draft" }];
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ posts: mockPosts }), { status: 200 }),
    );

    const { result } = renderHook(() => usePosts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockPosts);
  });

  it("passes status filter as query param", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ posts: [] }), { status: 200 }),
      );

    const { result } = renderHook(() => usePosts({ status: "draft" }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("status=draft"),
    );
  });

  it("throws on non-OK response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    );

    const { result } = renderHook(() => usePosts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("usePost", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches a single post by id", async () => {
    const mockPost = {
      id: "post-1",
      body: "Hello",
      status: "draft",
      post_publications: [],
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ post: mockPost }), { status: 200 }),
    );

    const { result } = renderHook(() => usePost("post-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockPost);
  });
});

describe("useCreatePost", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends POST request to create a post", async () => {
    const mockPost = { id: "post-1", body: "Hello", status: "draft" };
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ post: mockPost }), { status: 201 }),
      );

    const { result } = renderHook(() => useCreatePost(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ body: "Hello", platforms: ["twitter"] });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSpy).toHaveBeenCalledWith("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "Hello", platforms: ["twitter"] }),
    });
  });
});

describe("useUpdatePost", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends PATCH request to update a post", async () => {
    const mockPost = { id: "post-1", body: "Updated", status: "draft" };
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ post: mockPost }), { status: 200 }),
      );

    const { result } = renderHook(() => useUpdatePost(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: "post-1", data: { body: "Updated" } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSpy).toHaveBeenCalledWith("/api/posts/post-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "Updated" }),
    });
  });
});

describe("useDeletePost", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends DELETE request", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), { status: 200 }),
      );

    const { result } = renderHook(() => useDeletePost(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("post-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSpy).toHaveBeenCalledWith("/api/posts/post-1", {
      method: "DELETE",
    });
  });
});

describe("usePublishPost", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends POST request to publish endpoint", async () => {
    const mockResults = [{ platform: "twitter", success: true }];
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ results: mockResults }), {
          status: 200,
        }),
      );

    const { result } = renderHook(() => usePublishPost(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("post-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSpy).toHaveBeenCalledWith("/api/posts/post-1/publish", {
      method: "POST",
    });
  });
});

describe("useClassifyPost", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends POST request to classify endpoint", async () => {
    const mockClassifications = {
      intent: "educate",
      content_type: "single",
      topics: ["ai"],
    };
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ classifications: mockClassifications }),
          { status: 200 },
        ),
      );

    const { result } = renderHook(() => useClassifyPost(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("post-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSpy).toHaveBeenCalledWith("/api/posts/post-1/classify", {
      method: "POST",
    });
    expect(result.current.data).toEqual(mockClassifications);
  });
});

describe("useUpdateClassifications", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends PATCH request to classifications endpoint", async () => {
    const mockPost = { id: "post-1", intent: "promote", ai_assisted: false };
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ post: mockPost }), { status: 200 }),
      );

    const { result } = renderHook(() => useUpdateClassifications(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      id: "post-1",
      data: { intent: "promote" },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/posts/post-1/classifications",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "promote" }),
      },
    );
  });
});
