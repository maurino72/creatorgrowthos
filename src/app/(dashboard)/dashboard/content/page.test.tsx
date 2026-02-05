import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
  usePathname: vi.fn(() => "/dashboard/content"),
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
});
