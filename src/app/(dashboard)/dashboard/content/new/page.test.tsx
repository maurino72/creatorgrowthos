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

vi.mock("@/lib/queries/ai", () => ({
  useGenerateIdeas: vi.fn(() => ({
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

import { useCreatePost } from "@/lib/queries/posts";
import { useGenerateIdeas } from "@/lib/queries/ai";

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
    expect(screen.getByPlaceholderText(/what's on your mind/i)).toBeInTheDocument();
  });

  it("shows character counter starting at 0", async () => {
    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText("0 / 280")).toBeInTheDocument();
  });

  it("updates character count as user types", async () => {
    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    const textarea = screen.getByPlaceholderText(/what's on your mind/i);
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

    const textarea = screen.getByPlaceholderText(/what's on your mind/i);
    fireEvent.change(textarea, { target: { value: "a".repeat(281) } });

    expect(screen.getByRole("button", { name: /publish now/i })).toBeDisabled();
  });

  it("shows schedule toggle", async () => {
    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByLabelText(/schedule for later/i)).toBeInTheDocument();
  });

  it("shows Get Ideas button", async () => {
    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByRole("button", { name: /get ideas/i })).toBeInTheDocument();
  });

  it("shows idea cards when ideas are generated", async () => {
    vi.mocked(useGenerateIdeas).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      data: [
        {
          headline: "Behind-the-scenes of AI tool building",
          format: "thread",
          intent: "educate",
          topic: "ai",
          rationale: "Your AI threads get 3x engagement",
          suggested_hook: "I just built an AI tool. Here's how:",
          confidence: "high",
        },
      ],
      isSuccess: true,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText("Behind-the-scenes of AI tool building")).toBeInTheDocument();
    expect(screen.getByText(/I just built an AI tool/)).toBeInTheDocument();
  });

  it("renders tag input section", async () => {
    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByPlaceholderText(/add tag/i)).toBeInTheDocument();
  });

  it("shows Suggest Hashtags button", async () => {
    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByRole("button", { name: /suggest hashtags/i })).toBeInTheDocument();
  });

  it("includes tags in char counter calculation", async () => {
    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    const textarea = screen.getByPlaceholderText(/what's on your mind/i);
    fireEvent.change(textarea, { target: { value: "Hello" } });

    // Add a tag via the input
    const tagInput = screen.getByPlaceholderText(/add tag/i);
    fireEvent.change(tagInput, { target: { value: "react" } });
    fireEvent.keyDown(tagInput, { key: "Enter" });

    // 5 (body) + 7 (" #react") = 12
    expect(screen.getByText("12 / 280")).toBeInTheDocument();
  });

  it("shows Use This Idea button on idea cards", async () => {
    vi.mocked(useGenerateIdeas).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      data: [
        {
          headline: "Test idea",
          format: "single",
          intent: "engage",
          topic: "ai",
          rationale: "Rationale",
          suggested_hook: "Hook text",
          confidence: "medium",
        },
      ],
      isSuccess: true,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByRole("button", { name: /use this idea/i })).toBeInTheDocument();
  });
});
