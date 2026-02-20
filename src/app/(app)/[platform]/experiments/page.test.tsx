import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
  })),
  usePathname: vi.fn(() => "/x/experiments"),
  useParams: vi.fn(() => ({ platform: "x" })),
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

vi.mock("@/lib/queries/experiments", () => ({
  useExperiments: vi.fn(),
  useSuggestExperiments: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  useAcceptExperiment: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  useDismissExperiment: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  experimentKeys: {
    all: ["experiments"],
    list: (filters: Record<string, string>) => ["experiments", "list", filters],
  },
}));

import { useExperiments } from "@/lib/queries/experiments";

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

describe("Experiments page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders page title", async () => {
    vi.mocked(useExperiments).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText("Experiments")).toBeInTheDocument();
  });

  it("shows loading skeletons while fetching", async () => {
    vi.mocked(useExperiments).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getAllByTestId("experiment-skeleton").length).toBeGreaterThan(0);
  });

  it("renders experiment cards", async () => {
    vi.mocked(useExperiments).mockReturnValue({
      data: [
        {
          id: "exp-1",
          type: "format_test",
          hypothesis: "Threads outperform single posts",
          description: "Post the same insight as both formats",
          status: "suggested",
          results: { recommended_action: "Create a thread", confidence: "high" },
        },
        {
          id: "exp-2",
          type: "topic_test",
          hypothesis: "AI topic resonates with audience",
          description: "Write about AI tools",
          status: "accepted",
          results: { recommended_action: "Post about AI", confidence: "medium" },
        },
      ],
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText("Threads outperform single posts")).toBeInTheDocument();
    expect(screen.getByText("AI topic resonates with audience")).toBeInTheDocument();
  });

  it("shows empty state when no experiments", async () => {
    vi.mocked(useExperiments).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText(/no experiments/i)).toBeInTheDocument();
  });

  it("shows Suggest Experiments button", async () => {
    vi.mocked(useExperiments).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByRole("button", { name: /suggest experiments/i })).toBeInTheDocument();
  });

  it("renders status filter tabs", async () => {
    vi.mocked(useExperiments).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByRole("button", { name: /^all$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /suggested/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /accepted/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /complete/i })).toBeInTheDocument();
  });

  it("shows accept and dismiss buttons for suggested experiments", async () => {
    vi.mocked(useExperiments).mockReturnValue({
      data: [
        {
          id: "exp-1",
          type: "format_test",
          hypothesis: "Test hypothesis",
          description: "Test description",
          status: "suggested",
          results: { recommended_action: "Do something", confidence: "high" },
        },
      ],
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    const acceptButtons = screen.getAllByRole("button", { name: /accept/i });
    expect(acceptButtons.length).toBeGreaterThanOrEqual(1);
    const dismissButtons = screen.getAllByRole("button", { name: /dismiss/i });
    expect(dismissButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("wraps content area with tab-content testid for transition feedback", async () => {
    vi.mocked(useExperiments).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByTestId("tab-content")).toBeInTheDocument();
  });

  it("shows type badges on experiment cards", async () => {
    vi.mocked(useExperiments).mockReturnValue({
      data: [
        {
          id: "exp-1",
          type: "format_test",
          hypothesis: "Test",
          description: "Desc",
          status: "suggested",
          results: {},
        },
      ],
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText("Format Test")).toBeInTheDocument();
  });
});
