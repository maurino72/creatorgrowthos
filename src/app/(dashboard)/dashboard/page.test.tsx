import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  usePathname: vi.fn(() => "/dashboard"),
}));

vi.mock("@/lib/queries/metrics", () => ({
  useDashboardMetrics: vi.fn(),
  useTopPosts: vi.fn(),
  metricKeys: {
    all: ["metrics"],
    dashboard: (days: number) => ["metrics", "dashboard", days],
    topPosts: (days: number, limit: number) => ["metrics", "topPosts", days, limit],
  },
}));

vi.mock("@/lib/queries/posts", () => ({
  usePosts: vi.fn(),
  postKeys: {
    all: ["posts"],
    list: (filters: Record<string, string>) => ["posts", "list", filters],
  },
}));

import { useDashboardMetrics, useTopPosts } from "@/lib/queries/metrics";
import { usePosts } from "@/lib/queries/posts";

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

describe("Dashboard page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders dashboard heading", async () => {
    vi.mocked(useDashboardMetrics).mockReturnValue({
      data: null,
      isLoading: true,
    } as never);
    vi.mocked(useTopPosts).mockReturnValue({
      data: null,
      isLoading: true,
    } as never);
    vi.mocked(usePosts).mockReturnValue({
      data: [],
      isLoading: true,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("shows metrics summary when data loaded", async () => {
    vi.mocked(useDashboardMetrics).mockReturnValue({
      data: {
        totalImpressions: 12500,
        totalLikes: 350,
        totalReplies: 80,
        totalReposts: 120,
        totalEngagement: 550,
        averageEngagementRate: 0.044,
        postCount: 15,
      },
      isLoading: false,
    } as never);
    vi.mocked(useTopPosts).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);
    vi.mocked(usePosts).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText("12.5K")).toBeInTheDocument();
    expect(screen.getByText("550")).toBeInTheDocument();
    expect(screen.getByText("4.4%")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
  });

  it("shows empty state when no posts exist", async () => {
    vi.mocked(useDashboardMetrics).mockReturnValue({
      data: {
        totalImpressions: 0,
        totalLikes: 0,
        totalReplies: 0,
        totalReposts: 0,
        totalEngagement: 0,
        averageEngagementRate: 0,
        postCount: 0,
      },
      isLoading: false,
    } as never);
    vi.mocked(useTopPosts).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);
    vi.mocked(usePosts).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText(/publish your first post/i)).toBeInTheDocument();
  });

  it("shows metrics-pending state when posts exist but no metrics yet", async () => {
    vi.mocked(useDashboardMetrics).mockReturnValue({
      data: {
        totalImpressions: 0,
        totalLikes: 0,
        totalReplies: 0,
        totalReposts: 0,
        totalEngagement: 0,
        averageEngagementRate: 0,
        postCount: 0,
      },
      isLoading: false,
    } as never);
    vi.mocked(useTopPosts).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);
    vi.mocked(usePosts).mockReturnValue({
      data: [
        { id: "post-1", body: "Published post", status: "published" },
        { id: "post-2", body: "Scheduled post", status: "scheduled" },
      ],
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText(/metrics are being collected/i)).toBeInTheDocument();
    expect(screen.queryByText(/publish your first post/i)).not.toBeInTheDocument();
  });

  it("shows top performing posts", async () => {
    vi.mocked(useDashboardMetrics).mockReturnValue({
      data: {
        totalImpressions: 5000,
        totalLikes: 100,
        totalReplies: 20,
        totalReposts: 30,
        totalEngagement: 150,
        averageEngagementRate: 0.03,
        postCount: 5,
      },
      isLoading: false,
    } as never);
    vi.mocked(useTopPosts).mockReturnValue({
      data: [
        {
          id: "event-1",
          impressions: 3000,
          likes: 80,
          replies: 15,
          reposts: 20,
          engagement_rate: 0.038,
          post_publications: {
            post_id: "post-1",
            platform: "twitter",
            posts: { body: "Best performing tweet!", status: "published" },
          },
        },
      ],
      isLoading: false,
    } as never);
    vi.mocked(usePosts).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText("Top performing posts")).toBeInTheDocument();
    expect(screen.getByText(/Best performing tweet!/)).toBeInTheDocument();
  });

  it("shows period selector tabs", async () => {
    vi.mocked(useDashboardMetrics).mockReturnValue({
      data: null,
      isLoading: true,
    } as never);
    vi.mocked(useTopPosts).mockReturnValue({
      data: null,
      isLoading: true,
    } as never);
    vi.mocked(usePosts).mockReturnValue({
      data: [],
      isLoading: true,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByRole("button", { name: /7 days/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /30 days/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /90 days/i })).toBeInTheDocument();
  });
});
