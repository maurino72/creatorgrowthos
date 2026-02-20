import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// ─── Mocks ──────────────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  usePathname: vi.fn().mockReturnValue("/x/analytics/pub-1"),
  useParams: vi.fn().mockReturnValue({ platform: "x", id: "pub-1" }),
  useRouter: vi.fn().mockReturnValue({ replace: vi.fn(), back: vi.fn() }),
  useSearchParams: vi.fn().mockReturnValue(new URLSearchParams()),
}));

vi.mock("next/dynamic", () => ({
  default: () => {
    function MockChart() {
      return <div data-testid="post-metrics-chart">Chart</div>;
    }
    MockChart.displayName = "MockChart";
    return MockChart;
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockPublication = {
  id: "pub-1",
  platform: "twitter",
  platform_post_id: "tweet-123",
  published_at: "2025-01-15T12:00:00Z",
  status: "published",
  posts: {
    id: "post-1",
    body: "This is my best tweet ever about analytics and growth",
    content_type: "text",
    tags: ["analytics", "growth"],
    created_at: "2025-01-15T10:00:00Z",
  },
};

const mockSnapshots = [
  {
    id: "snap-1",
    impressions: 1000,
    unique_reach: null,
    reactions: 20,
    comments: 5,
    shares: 3,
    quotes: 2,
    bookmarks: 8,
    video_plays: null,
    video_watch_time_ms: null,
    video_unique_viewers: null,
    fetched_at: "2025-01-15T13:00:00Z",
  },
  {
    id: "snap-2",
    impressions: 4500,
    unique_reach: null,
    reactions: 89,
    comments: 12,
    shares: 7,
    quotes: 5,
    bookmarks: 25,
    video_plays: null,
    video_watch_time_ms: null,
    video_unique_viewers: null,
    fetched_at: "2025-01-15T18:30:00Z",
  },
];

const mockLatest = mockSnapshots[1];

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

describe("PostAnalyticsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/api/analytics/posts/pub-1")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              publication: mockPublication,
              snapshots: mockSnapshots,
              latest: mockLatest,
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
    vi.stubGlobal("fetch", mockFetch);
  });

  it("renders the post content preview", async () => {
    const { default: PostAnalyticsPage } = await import("./page");
    render(<PostAnalyticsPage />, { wrapper: createWrapper() });

    await screen.findByText(
      /This is my best tweet ever about analytics and growth/,
    );
  });

  it("shows latest metric values", async () => {
    const { default: PostAnalyticsPage } = await import("./page");
    render(<PostAnalyticsPage />, { wrapper: createWrapper() });

    await screen.findByText("Impressions");
    expect(screen.getByText("Reactions")).toBeInTheDocument();
    expect(screen.getByText("Comments")).toBeInTheDocument();
  });

  it("shows platform badge", async () => {
    const { default: PostAnalyticsPage } = await import("./page");
    render(<PostAnalyticsPage />, { wrapper: createWrapper() });

    await screen.findByText("X (Twitter)");
  });

  it("renders back link", async () => {
    const { default: PostAnalyticsPage } = await import("./page");
    render(<PostAnalyticsPage />, { wrapper: createWrapper() });

    await screen.findByText("Back to Analytics");
  });

  it("shows 404 when publication not found", async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: "Not found" }),
      }),
    );

    const { default: PostAnalyticsPage } = await import("./page");
    render(<PostAnalyticsPage />, { wrapper: createWrapper() });

    await screen.findByText(/not found|error/i);
  });
});
