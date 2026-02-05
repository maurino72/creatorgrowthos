import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    back: vi.fn(),
  })),
  usePathname: vi.fn(() => "/dashboard/content/new"),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
  Toaster: () => null,
}));

vi.mock("@/lib/queries/posts", () => ({
  useCreatePost: vi.fn(() => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue({ id: "post-1" }),
    isPending: false,
  })),
  postKeys: {
    all: ["posts"],
    list: (f: Record<string, string>) => ["posts", "list", f],
    detail: (id: string) => ["posts", "detail", id],
  },
}));

vi.mock("@/lib/queries/connections", () => ({
  useConnections: vi.fn(() => ({
    data: [
      {
        id: "conn-1",
        platform: "twitter",
        platform_username: "testuser",
        status: "active",
      },
    ],
    isLoading: false,
  })),
}));

import { useCreatePost } from "@/lib/queries/posts";

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

describe("New post editor page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the editor form", async () => {
    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText(/new post/i)).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("shows character counter starting at 0", async () => {
    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText("0 / 280")).toBeInTheDocument();
  });

  it("updates character count as user types", async () => {
    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Hello" } });

    expect(screen.getByText("5 / 280")).toBeInTheDocument();
  });

  it("shows connected platforms as checkboxes", async () => {
    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByLabelText(/twitter/i)).toBeInTheDocument();
  });

  it("shows warning when no platforms connected", async () => {
    const { useConnections } = await import("@/lib/queries/connections");
    vi.mocked(useConnections).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText(/no platforms connected/i)).toBeInTheDocument();
  });

  it("renders Save Draft button", async () => {
    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByRole("button", { name: /save draft/i })).toBeInTheDocument();
  });

  it("renders Publish Now button", async () => {
    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByRole("button", { name: /publish now/i })).toBeInTheDocument();
  });

  it("disables submit buttons when body exceeds 280 characters", async () => {
    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "a".repeat(281) } });

    expect(screen.getByRole("button", { name: /publish now/i })).toBeDisabled();
  });

  it("shows schedule toggle", async () => {
    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByLabelText(/schedule for later/i)).toBeInTheDocument();
  });
});
