import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<{ default: React.ComponentType }>) => {
    let Component: React.ComponentType | null = null;
    loader().then((mod) => { Component = mod.default; });
    return function DynamicMock(props: Record<string, unknown>) {
      if (!Component) return null;
      return <Component {...props} />;
    };
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
  usePathname: vi.fn(() => "/x/dashboard"),
  useParams: vi.fn(() => ({ platform: "x" })),
}));

vi.mock("@/lib/queries/connections", () => ({
  useConnections: vi.fn(() => ({
    data: [{ platform: "twitter", status: "active", platform_username: "testuser" }],
    isLoading: false,
  })),
  connectionKeys: { all: ["connections"] },
}));

vi.mock("./charts", () => ({
  default: ({ data }: { data: unknown[] }) => (
    <div data-testid="metrics-charts">
      <div data-testid="area-chart">Impressions ({data.length} points)</div>
      <div data-testid="bar-chart">Engagement ({data.length} points)</div>
    </div>
  ),
}));

vi.mock("@/lib/queries/metrics", () => ({
  useDashboardMetrics: vi.fn(),
  useTopPosts: vi.fn(),
  useMetricsTimeSeries: vi.fn(),
  metricKeys: {
    all: ["metrics"],
    dashboard: (days: number) => ["metrics", "dashboard", days],
    topPosts: (days: number, limit: number) => ["metrics", "topPosts", days, limit],
    timeSeries: (days: number) => ["metrics", "timeSeries", days],
  },
}));

vi.mock("@/lib/queries/posts", () => ({
  usePosts: vi.fn(),
  postKeys: {
    all: ["posts"],
    list: (filters: Record<string, string>) => ["posts", "list", filters],
  },
}));

vi.mock("@/lib/queries/insights", () => ({
  useInsights: vi.fn(),
  useGenerateInsights: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  useDismissInsight: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  useMarkInsightActed: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  insightKeys: {
    all: ["insights"],
    list: (filters: Record<string, string>) => ["insights", "list", filters],
  },
}));

import { useDashboardMetrics, useTopPosts, useMetricsTimeSeries } from "@/lib/queries/metrics";
import { usePosts } from "@/lib/queries/posts";
import { useInsights } from "@/lib/queries/insights";

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
    // Default: no time-series data
    vi.mocked(useMetricsTimeSeries).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockDefaultInsights() {
    vi.mocked(useInsights).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);
  }

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
    mockDefaultInsights();

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
    mockDefaultInsights();

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
    mockDefaultInsights();

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
    mockDefaultInsights();

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
    mockDefaultInsights();

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
    mockDefaultInsights();

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByRole("button", { name: /7 days/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /30 days/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /90 days/i })).toBeInTheDocument();
  });

  it("shows insights section with active insights", async () => {
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
      data: [],
      isLoading: false,
    } as never);
    vi.mocked(usePosts).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);
    vi.mocked(useInsights).mockReturnValue({
      data: [
        {
          id: "i1",
          type: "performance_pattern",
          headline: "Educational content is your superpower",
          detail: "Your educational posts get 3.2x more engagement.",
          action: "Post more educational threads",
          confidence: "high",
          data_points: [],
          status: "active",
        },
        {
          id: "i2",
          type: "opportunity",
          headline: "Threads outperform single posts",
          detail: "Threads average 3,500 impressions vs 1,200.",
          action: "Convert top posts to threads",
          confidence: "medium",
          data_points: [],
          status: "active",
        },
        {
          id: "i3",
          type: "anomaly",
          headline: "One post broke out",
          detail: "Your top post got 8,000 impressions.",
          action: "Analyze what made it successful",
          confidence: "high",
          data_points: [],
          status: "active",
        },
      ],
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText("Insights")).toBeInTheDocument();
    expect(screen.getByText("Educational content is your superpower")).toBeInTheDocument();
    expect(screen.getByText("Threads outperform single posts")).toBeInTheDocument();
    expect(screen.getByText("One post broke out")).toBeInTheDocument();
  });

  it("shows insights empty state when no insights exist", async () => {
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
      data: [],
      isLoading: false,
    } as never);
    vi.mocked(usePosts).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);
    mockDefaultInsights();

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText("Insights")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /generate insights/i })).toBeInTheDocument();
  });

  it("wraps content area with tab-content testid for transition feedback", async () => {
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
    mockDefaultInsights();

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByTestId("tab-content")).toBeInTheDocument();
  });

  it("shows view all insights link", async () => {
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
      data: [],
      isLoading: false,
    } as never);
    vi.mocked(usePosts).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);
    vi.mocked(useInsights).mockReturnValue({
      data: [
        {
          id: "i1",
          type: "performance_pattern",
          headline: "Test insight",
          detail: "Detail",
          action: "Do something",
          confidence: "high",
          data_points: [],
          status: "active",
        },
        {
          id: "i2",
          type: "opportunity",
          headline: "Test 2",
          detail: "Detail 2",
          action: "Do something else",
          confidence: "medium",
          data_points: [],
          status: "active",
        },
        {
          id: "i3",
          type: "anomaly",
          headline: "Test 3",
          detail: "Detail 3",
          action: "Do another thing",
          confidence: "low",
          data_points: [],
          status: "active",
        },
      ],
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByRole("link", { name: /view all/i })).toHaveAttribute(
      "href",
      "/x/insights",
    );
  });

  it("shows charts when time-series data is available", async () => {
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
      data: [],
      isLoading: false,
    } as never);
    vi.mocked(usePosts).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);
    mockDefaultInsights();
    vi.mocked(useMetricsTimeSeries).mockReturnValue({
      data: [
        { date: "2025-01-15", impressions: 300, likes: 30, replies: 10, reposts: 15, engagement: 55 },
        { date: "2025-01-16", impressions: 150, likes: 12, replies: 4, reposts: 6, engagement: 22 },
      ],
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByTestId("metrics-charts")).toBeInTheDocument();
    expect(screen.getByTestId("area-chart")).toBeInTheDocument();
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
  });

  it("does not show charts when time-series has less than 2 data points", async () => {
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
      data: [],
      isLoading: false,
    } as never);
    vi.mocked(usePosts).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);
    mockDefaultInsights();
    vi.mocked(useMetricsTimeSeries).mockReturnValue({
      data: [
        { date: "2025-01-15", impressions: 300, likes: 30, replies: 10, reposts: 15, engagement: 55 },
      ],
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.queryByTestId("metrics-charts")).not.toBeInTheDocument();
  });
});
