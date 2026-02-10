import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
  })),
  usePathname: vi.fn(() => "/dashboard/content"),
  useSearchParams: vi.fn(() => ({ get: () => null, toString: () => "" })),
}));

vi.mock("@/lib/queries/connections", () => ({
  useConnections: vi.fn(() => ({
    data: [{ platform: "twitter", status: "active", platform_username: "testuser" }],
    isLoading: false,
  })),
  connectionKeys: { all: ["connections"] },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
  Toaster: () => null,
}));

vi.mock("@/lib/queries/posts", () => ({
  usePosts: vi.fn(),
  useDeletePost: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  usePublishPost: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  postKeys: {
    all: ["posts"],
    list: (f: Record<string, string>) => ["posts", "list", f],
    detail: (id: string) => ["posts", "detail", id],
  },
}));

vi.mock("@/lib/queries/metrics", () => ({
  useLatestMetrics: vi.fn(() => ({
    data: null,
    isLoading: false,
  })),
  metricKeys: {
    all: ["metrics"],
    latest: (id: string) => ["metrics", "latest", id],
  },
}));

import { usePosts } from "@/lib/queries/posts";
import { useLatestMetrics } from "@/lib/queries/metrics";

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

describe("Content list page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders page title", async () => {
    vi.mocked(usePosts).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("shows loading skeletons while fetching", async () => {
    vi.mocked(usePosts).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getAllByTestId("post-skeleton").length).toBeGreaterThan(0);
  });

  it("renders status filter tabs", async () => {
    vi.mocked(usePosts).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByRole("button", { name: /all/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /drafts/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /scheduled/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /published/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /failed/i })).toBeInTheDocument();
  });

  it("renders post cards with body preview", async () => {
    vi.mocked(usePosts).mockReturnValue({
      data: [
        {
          id: "post-1",
          body: "Hello world! This is my first tweet.",
          status: "draft",
          created_at: "2024-06-01T12:00:00Z",
          post_publications: [{ platform: "twitter", status: "pending" }],
        },
      ],
      isLoading: false,
      isError: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText(/Hello world!/)).toBeInTheDocument();
  });

  it("shows status badge on post cards", async () => {
    vi.mocked(usePosts).mockReturnValue({
      data: [
        {
          id: "post-1",
          body: "Draft post",
          status: "draft",
          created_at: "2024-06-01T12:00:00Z",
          post_publications: [{ platform: "twitter", status: "pending" }],
        },
      ],
      isLoading: false,
      isError: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("shows empty state when no posts exist", async () => {
    vi.mocked(usePosts).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText(/create your first post/i)).toBeInTheDocument();
  });

  it("renders New Post link", async () => {
    vi.mocked(usePosts).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByRole("link", { name: /new post/i })).toHaveAttribute(
      "href",
      "/dashboard/content/new",
    );
  });

  it("shows platform icons on post cards", async () => {
    vi.mocked(usePosts).mockReturnValue({
      data: [
        {
          id: "post-1",
          body: "Multi-platform post",
          status: "draft",
          created_at: "2024-06-01T12:00:00Z",
          post_publications: [
            { platform: "twitter", status: "pending" },
          ],
        },
      ],
      isLoading: false,
      isError: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByTestId("platform-twitter")).toBeInTheDocument();
  });

  it("shows metrics on published post cards", async () => {
    vi.mocked(usePosts).mockReturnValue({
      data: [
        {
          id: "post-1",
          body: "Published post with metrics",
          status: "published",
          published_at: "2024-06-01T12:00:00Z",
          created_at: "2024-06-01T10:00:00Z",
          post_publications: [{ platform: "twitter", status: "published" }],
        },
      ],
      isLoading: false,
      isError: false,
    } as never);

    vi.mocked(useLatestMetrics).mockReturnValue({
      data: [
        {
          id: "event-1",
          impressions: 1500,
          likes: 42,
          replies: 7,
          reposts: 12,
          engagement_rate: 0.041,
          observed_at: new Date().toISOString(),
        },
      ],
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText("1.5K")).toBeInTheDocument();
    expect(screen.getByText("Views")).toBeInTheDocument();
    expect(screen.getByText(/42/)).toBeInTheDocument();
    expect(screen.getByText(/4\.1%/)).toBeInTheDocument();
  });

  it("does not show metrics on draft post cards", async () => {
    vi.mocked(usePosts).mockReturnValue({
      data: [
        {
          id: "post-1",
          body: "Draft post without metrics",
          status: "draft",
          created_at: "2024-06-01T10:00:00Z",
          post_publications: [{ platform: "twitter", status: "pending" }],
        },
      ],
      isLoading: false,
      isError: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.queryByText(/views/)).not.toBeInTheDocument();
    expect(screen.queryByText(/engagement/)).not.toBeInTheDocument();
  });

  it("wraps content area with tab-content testid for transition feedback", async () => {
    vi.mocked(usePosts).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByTestId("tab-content")).toBeInTheDocument();
  });

  it("shows classification badges on post cards", async () => {
    vi.mocked(usePosts).mockReturnValue({
      data: [
        {
          id: "post-1",
          body: "How to build a SaaS product from scratch",
          status: "draft",
          intent: "educate",
          content_type: "thread",
          topics: ["saas", "startup"],
          ai_assisted: true,
          created_at: "2024-06-01T10:00:00Z",
          post_publications: [{ platform: "twitter", status: "pending" }],
        },
      ],
      isLoading: false,
      isError: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText("educate")).toBeInTheDocument();
    expect(screen.getByText("saas")).toBeInTheDocument();
    expect(screen.getByText("startup")).toBeInTheDocument();
  });

  it("does not show classification badges for unclassified posts", async () => {
    vi.mocked(usePosts).mockReturnValue({
      data: [
        {
          id: "post-1",
          body: "Unclassified post",
          status: "draft",
          intent: null,
          content_type: null,
          topics: [],
          ai_assisted: false,
          created_at: "2024-06-01T10:00:00Z",
          post_publications: [{ platform: "twitter", status: "pending" }],
        },
      ],
      isLoading: false,
      isError: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.queryByText("educate")).not.toBeInTheDocument();
    expect(screen.queryByText("engage")).not.toBeInTheDocument();
  });
});
