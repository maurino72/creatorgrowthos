import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// ─── Mocks ──────────────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  usePathname: vi.fn().mockReturnValue("/x/analytics"),
  useParams: vi.fn().mockReturnValue({ platform: "x" }),
  useRouter: vi.fn().mockReturnValue({ replace: vi.fn() }),
  useSearchParams: vi.fn().mockReturnValue(new URLSearchParams()),
}));

vi.mock("next/dynamic", () => ({
  default: () => {
    function MockCharts() {
      return <div data-testid="analytics-charts">Charts</div>;
    }
    MockCharts.displayName = "MockCharts";
    return MockCharts;
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockOverview = {
  period: "30d",
  platforms: {
    twitter: {
      posts_count: 10,
      total_impressions: 50000,
      total_reach: 0,
      total_reactions: 500,
      total_comments: 100,
      total_shares: 50,
      total_quotes: 20,
      total_bookmarks: 30,
      avg_engagement_rate: 3.2,
      follower_count: 5000,
      follower_growth: 200,
      follower_growth_rate: 4.2,
    },
  },
  combined: {
    total_posts: 10,
    total_impressions: 50000,
    total_engagements: 650,
    avg_engagement_rate: 3.2,
    total_follower_growth: 200,
  },
};

const mockPosts = {
  posts: [
    {
      id: "post-1",
      publication_id: "pub-1",
      platform: "twitter",
      platform_post_id: "tweet-1",
      content_type: "text",
      commentary: "This is a great tweet about analytics",
      published_at: "2025-01-15T12:00:00Z",
      metrics: {
        impressions: 5000,
        reactions: 100,
        comments: 20,
        shares: 10,
        engagement_rate: 2.6,
      },
      metrics_updated_at: "2025-01-15T18:00:00Z",
    },
  ],
  summary: { total_posts: 10 },
  pagination: { page: 1, per_page: 5, total: 10 },
};

const mockFollowers = {
  period: "30d",
  platforms: {
    twitter: {
      current_count: 5000,
      start_count: 4800,
      net_growth: 200,
      growth_rate: 4.2,
      daily: [
        { date: "2025-01-01", count: 4800, new: 10 },
        { date: "2025-01-02", count: 4810, new: 12 },
      ],
    },
  },
};

const mockFetch = vi.fn();

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

// ─── Tests ──────────────────────────────────────────────────────────────

describe("AnalyticsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/api/analytics/overview")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockOverview),
        });
      }
      if (url.includes("/api/analytics/posts")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPosts),
        });
      }
      if (url.includes("/api/analytics/followers")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockFollowers),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
    vi.stubGlobal("fetch", mockFetch);
  });

  it("renders the analytics page title", async () => {
    const { default: AnalyticsPage } = await import("./page");
    render(<AnalyticsPage />, { wrapper: createWrapper() });

    expect(screen.getByText("Analytics")).toBeInTheDocument();
  });

  it("renders period selector tabs", async () => {
    const { default: AnalyticsPage } = await import("./page");
    render(<AnalyticsPage />, { wrapper: createWrapper() });

    expect(screen.getByText("7 days")).toBeInTheDocument();
    expect(screen.getByText("30 days")).toBeInTheDocument();
    expect(screen.getByText("90 days")).toBeInTheDocument();
  });

  it("renders metric cards with overview data", async () => {
    const { default: AnalyticsPage } = await import("./page");
    render(<AnalyticsPage />, { wrapper: createWrapper() });

    // Wait for data to load
    await screen.findByText("Total Impressions");
    expect(screen.getByText("Engagements")).toBeInTheDocument();
    expect(screen.getByText("Follower Growth")).toBeInTheDocument();
    expect(screen.getByText("Posts Published")).toBeInTheDocument();
  });

  it("renders platform breakdown section", async () => {
    const { default: AnalyticsPage } = await import("./page");
    render(<AnalyticsPage />, { wrapper: createWrapper() });

    await screen.findByText("Platform breakdown");
    expect(screen.getAllByText("X (Twitter)").length).toBeGreaterThan(0);
  });

  it("renders top performing posts section", async () => {
    const { default: AnalyticsPage } = await import("./page");
    render(<AnalyticsPage />, { wrapper: createWrapper() });

    await screen.findByText("Top performing posts");
    expect(
      screen.getByText("This is a great tweet about analytics"),
    ).toBeInTheDocument();
  });

  it("shows empty state when no data", async () => {
    const emptyOverview = {
      period: "30d",
      platforms: {},
      combined: {
        total_posts: 0,
        total_impressions: 0,
        total_engagements: 0,
        avg_engagement_rate: 0,
        total_follower_growth: 0,
      },
    };
    const emptyPosts = {
      posts: [],
      summary: { total_posts: 0 },
      pagination: { page: 1, per_page: 5, total: 0 },
    };
    const emptyFollowers = { period: "30d", platforms: {} };

    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/api/analytics/overview")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(emptyOverview),
        });
      }
      if (url.includes("/api/analytics/posts")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(emptyPosts),
        });
      }
      if (url.includes("/api/analytics/followers")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(emptyFollowers),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });

    const { default: AnalyticsPage } = await import("./page");
    render(<AnalyticsPage />, { wrapper: createWrapper() });

    await screen.findByText(
      /No analytics data yet/,
    );
  });
});
