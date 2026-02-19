import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  useParams: vi.fn(() => ({ id: "post-1" })),
  usePathname: vi.fn(() => "/dashboard/content/post-1/edit"),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

vi.mock("@/lib/queries/posts", () => ({
  usePost: vi.fn(),
  useUpdatePost: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDeletePost: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  usePublishPost: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useClassifyPost: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useUpdateClassifications: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  postKeys: {
    all: ["posts"],
    detail: (id: string) => ["posts", "detail", id],
  },
}));

vi.mock("@/lib/queries/connections", () => ({
  useConnections: vi.fn(() => ({ data: [] })),
}));

vi.mock("@/lib/queries/metrics", () => ({
  usePostMetrics: vi.fn(() => ({ data: null, isLoading: false })),
  useLatestMetrics: vi.fn(() => ({ data: null, isLoading: false })),
  useRefreshMetrics: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  metricKeys: {
    all: ["metrics"],
    post: (id: string) => ["metrics", "post", id],
    latest: (id: string) => ["metrics", "latest", id],
  },
}));

vi.mock("@/lib/queries/ai", () => ({
  useImproveContent: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    data: null,
    isSuccess: false,
  })),
  useSuggestHashtags: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    data: null,
    isSuccess: false,
  })),
  useSuggestMentions: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    data: null,
    isSuccess: false,
  })),
}));

import { usePost } from "@/lib/queries/posts";
import { useLatestMetrics, usePostMetrics } from "@/lib/queries/metrics";
import { useImproveContent } from "@/lib/queries/ai";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

async function importPage() {
  const mod = await import("./page");
  return mod.default;
}

describe("Edit post page — metrics section", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows metrics section for published posts", async () => {
    vi.mocked(usePost).mockReturnValue({
      data: {
        id: "post-1",
        body: "Published post",
        status: "published",
        published_at: "2024-06-01T12:00:00Z",
        created_at: "2024-06-01T10:00:00Z",
        post_publications: [{ platform: "twitter", status: "published" }],
      },
      isLoading: false,
    } as never);

    vi.mocked(useLatestMetrics).mockReturnValue({
      data: [
        {
          id: "event-1",
          post_publication_id: "pub-1",
          impressions: 2500,
          likes: 65,
          replies: 12,
          reposts: 18,
          engagement_rate: 0.038,
          observed_at: new Date().toISOString(),
        },
      ],
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText("Performance")).toBeInTheDocument();
    expect(screen.getByText("2.5K")).toBeInTheDocument();
    expect(screen.getByText("95")).toBeInTheDocument(); // total engagement (65+12+18)
    expect(screen.getByText(/65 likes/)).toBeInTheDocument();
    expect(screen.getByText("3.8%")).toBeInTheDocument();
  });

  it("does not show metrics section for draft posts", async () => {
    vi.mocked(usePost).mockReturnValue({
      data: {
        id: "post-1",
        body: "Draft post",
        status: "draft",
        created_at: "2024-06-01T10:00:00Z",
        post_publications: [{ platform: "twitter", status: "pending" }],
      },
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.queryByText("Performance")).not.toBeInTheDocument();
  });

  it("shows empty state when no metrics available for published post", async () => {
    vi.mocked(usePost).mockReturnValue({
      data: {
        id: "post-1",
        body: "Published post",
        status: "published",
        published_at: "2024-06-01T12:00:00Z",
        created_at: "2024-06-01T10:00:00Z",
        post_publications: [{ platform: "twitter", status: "published" }],
      },
      isLoading: false,
    } as never);

    vi.mocked(useLatestMetrics).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText("Performance")).toBeInTheDocument();
    expect(screen.getByText(/metrics will appear soon/i)).toBeInTheDocument();
  });

  it("shows refresh button for published posts", async () => {
    vi.mocked(usePost).mockReturnValue({
      data: {
        id: "post-1",
        body: "Published post",
        status: "published",
        published_at: "2024-06-01T12:00:00Z",
        created_at: "2024-06-01T10:00:00Z",
        post_publications: [{ platform: "twitter", status: "published" }],
      },
      isLoading: false,
    } as never);

    vi.mocked(useLatestMetrics).mockReturnValue({
      data: [
        {
          id: "event-1",
          impressions: 100,
          likes: 5,
          replies: 1,
          reposts: 2,
          engagement_rate: 0.08,
          observed_at: new Date().toISOString(),
        },
      ],
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByRole("button", { name: /refresh/i })).toBeInTheDocument();
  });

  it("shows metrics timeline when data available", async () => {
    vi.mocked(usePost).mockReturnValue({
      data: {
        id: "post-1",
        body: "Published post",
        status: "published",
        published_at: "2024-06-01T12:00:00Z",
        created_at: "2024-06-01T10:00:00Z",
        post_publications: [{ platform: "twitter", status: "published" }],
      },
      isLoading: false,
    } as never);

    vi.mocked(useLatestMetrics).mockReturnValue({
      data: [
        {
          id: "event-1",
          impressions: 2500,
          likes: 65,
          replies: 12,
          reposts: 18,
          engagement_rate: 0.038,
          observed_at: new Date().toISOString(),
        },
      ],
      isLoading: false,
    } as never);

    vi.mocked(usePostMetrics).mockReturnValue({
      data: [
        { id: "event-2", impressions: 2500, hours_since_publish: 24, observed_at: "2024-06-02T12:00:00Z" },
        { id: "event-1", impressions: 800, hours_since_publish: 2, observed_at: "2024-06-01T14:00:00Z" },
      ],
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText("Performance over time")).toBeInTheDocument();
  });
});

describe("Edit post page — classification section", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows classification with AI badge for AI-classified post", async () => {
    vi.mocked(usePost).mockReturnValue({
      data: {
        id: "post-1",
        body: "How to build a SaaS",
        status: "draft",
        intent: "educate",
        content_type: "single",
        topics: ["saas", "startup"],
        ai_assisted: true,
        created_at: "2024-06-01T10:00:00Z",
        post_publications: [{ platform: "twitter", status: "pending" }],
      },
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText("Classification")).toBeInTheDocument();
    expect(screen.getByText("educate")).toBeInTheDocument();
    expect(screen.getByText("single")).toBeInTheDocument();
    expect(screen.getByText("saas")).toBeInTheDocument();
    expect(screen.getByText("startup")).toBeInTheDocument();
    expect(screen.getByText("AI")).toBeInTheDocument();
  });

  it("shows pending state for unclassified post", async () => {
    vi.mocked(usePost).mockReturnValue({
      data: {
        id: "post-1",
        body: "Some post",
        status: "draft",
        intent: null,
        content_type: null,
        topics: [],
        ai_assisted: false,
        created_at: "2024-06-01T10:00:00Z",
        post_publications: [{ platform: "twitter", status: "pending" }],
      },
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText("Classification")).toBeInTheDocument();
    expect(screen.getByText(/not yet classified/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /classify/i })).toBeInTheDocument();
  });

  it("does not show AI badge for manually overridden classification", async () => {
    vi.mocked(usePost).mockReturnValue({
      data: {
        id: "post-1",
        body: "My hot take",
        status: "draft",
        intent: "engage",
        content_type: "single",
        topics: ["marketing"],
        ai_assisted: false,
        created_at: "2024-06-01T10:00:00Z",
        post_publications: [{ platform: "twitter", status: "pending" }],
      },
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText("engage")).toBeInTheDocument();
    expect(screen.queryByText("AI")).not.toBeInTheDocument();
  });

  it("shows classify button for published posts too", async () => {
    vi.mocked(usePost).mockReturnValue({
      data: {
        id: "post-1",
        body: "Published post",
        status: "published",
        intent: null,
        content_type: null,
        topics: [],
        ai_assisted: false,
        published_at: "2024-06-01T12:00:00Z",
        created_at: "2024-06-01T10:00:00Z",
        post_publications: [{ platform: "twitter", status: "published" }],
      },
      isLoading: false,
    } as never);

    vi.mocked(useLatestMetrics).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByRole("button", { name: /classify/i })).toBeInTheDocument();
  });
});

describe("Edit post page — improve section", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows Improve button for draft posts", async () => {
    vi.mocked(usePost).mockReturnValue({
      data: {
        id: "post-1",
        body: "My draft post",
        status: "draft",
        created_at: "2024-06-01T10:00:00Z",
        post_publications: [{ platform: "twitter", status: "pending" }],
      },
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByRole("button", { name: /improve/i })).toBeInTheDocument();
  });

  it("does not show Improve button for published posts", async () => {
    vi.mocked(usePost).mockReturnValue({
      data: {
        id: "post-1",
        body: "Published post",
        status: "published",
        published_at: "2024-06-01T12:00:00Z",
        created_at: "2024-06-01T10:00:00Z",
        post_publications: [{ platform: "twitter", status: "published" }],
      },
      isLoading: false,
    } as never);

    vi.mocked(useLatestMetrics).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.queryByRole("button", { name: /improve/i })).not.toBeInTheDocument();
  });

  it("pre-populates tags from post data", async () => {
    vi.mocked(usePost).mockReturnValue({
      data: {
        id: "post-1",
        body: "My tagged post",
        status: "draft",
        tags: ["react", "nextjs"],
        created_at: "2024-06-01T10:00:00Z",
        post_publications: [{ platform: "twitter", status: "pending" }],
      },
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText("#react")).toBeInTheDocument();
    expect(screen.getByText("#nextjs")).toBeInTheDocument();
  });

  it("shows tags as read-only for published posts", async () => {
    vi.mocked(usePost).mockReturnValue({
      data: {
        id: "post-1",
        body: "Published post",
        status: "published",
        tags: ["react"],
        published_at: "2024-06-01T12:00:00Z",
        created_at: "2024-06-01T10:00:00Z",
        post_publications: [{ platform: "twitter", status: "published" }],
      },
      isLoading: false,
    } as never);

    vi.mocked(useLatestMetrics).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    // Tag should be shown
    expect(screen.getByText("#react")).toBeInTheDocument();
    // Input should be disabled
    expect(screen.getByPlaceholderText(/add tag/i)).toBeDisabled();
  });

  it("shows improvement suggestions when available", async () => {
    vi.mocked(usePost).mockReturnValue({
      data: {
        id: "post-1",
        body: "My draft post",
        status: "draft",
        created_at: "2024-06-01T10:00:00Z",
        post_publications: [{ platform: "twitter", status: "pending" }],
      },
      isLoading: false,
    } as never);

    vi.mocked(useImproveContent).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      data: {
        overall_assessment: "Strong draft with room for a better hook",
        improvements: [
          { type: "hook", suggestion: "Lead with outcome", example: "I grew to $10K MRR" },
          { type: "engagement", suggestion: "End with a question", example: "What about you?" },
        ],
        improved_version: "Better version of the post",
      },
      isSuccess: true,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText(/strong draft/i)).toBeInTheDocument();
    expect(screen.getByText(/lead with outcome/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /apply improved version/i })).toBeInTheDocument();
  });
});
