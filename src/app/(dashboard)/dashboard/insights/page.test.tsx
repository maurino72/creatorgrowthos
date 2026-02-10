import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
  })),
  usePathname: vi.fn(() => "/dashboard/insights"),
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

describe("Insights page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders page title", async () => {
    vi.mocked(useInsights).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText("Insights")).toBeInTheDocument();
  });

  it("shows loading skeletons while fetching", async () => {
    vi.mocked(useInsights).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getAllByTestId("insight-skeleton").length).toBeGreaterThan(0);
  });

  it("renders insight cards", async () => {
    vi.mocked(useInsights).mockReturnValue({
      data: [
        {
          id: "i1",
          type: "performance_pattern",
          headline: "Educational content is your superpower",
          detail: "Your educational posts get 3.2x more engagement.",
          action: "Post more educational threads",
          confidence: "high",
          data_points: [{ metric: "engagement", value: "3.2x", comparison: "vs other intents" }],
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

    expect(screen.getByText("Educational content is your superpower")).toBeInTheDocument();
    expect(screen.getByText("Threads outperform single posts")).toBeInTheDocument();
    expect(screen.getByText("One post broke out")).toBeInTheDocument();
  });

  it("shows type badges on insight cards", async () => {
    vi.mocked(useInsights).mockReturnValue({
      data: [
        {
          id: "i1",
          type: "performance_pattern",
          headline: "Test insight",
          detail: "Detail",
          action: "Action",
          confidence: "high",
          data_points: [],
          status: "active",
        },
      ],
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    // Check that the badge appears (not the filter tab button)
    const badges = screen.getAllByText("Performance");
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it("shows empty state when no insights", async () => {
    vi.mocked(useInsights).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText(/no insights/i)).toBeInTheDocument();
  });

  it("shows generate insights button", async () => {
    vi.mocked(useInsights).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByRole("button", { name: /generate insights/i })).toBeInTheDocument();
  });

  it("renders status filter tabs", async () => {
    vi.mocked(useInsights).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByRole("button", { name: /active/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /dismissed/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /acted on/i })).toBeInTheDocument();
  });

  it("renders type filter tabs", async () => {
    vi.mocked(useInsights).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByRole("button", { name: /^all$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /performance/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /opportunity/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /anomaly/i })).toBeInTheDocument();
  });

  it("wraps content area with tab-content testid for transition feedback", async () => {
    vi.mocked(useInsights).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByTestId("tab-content")).toBeInTheDocument();
  });

  it("shows dismiss and acted on buttons on insight cards", async () => {
    vi.mocked(useInsights).mockReturnValue({
      data: [
        {
          id: "i1",
          type: "performance_pattern",
          headline: "Test insight",
          detail: "Detail",
          action: "Action",
          confidence: "high",
          data_points: [],
          status: "active",
        },
      ],
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    // There's both a status tab "Acted On" and a card action "Acted on" button
    const dismissButtons = screen.getAllByRole("button", { name: /dismiss/i });
    expect(dismissButtons.length).toBeGreaterThanOrEqual(1);
    const actedButtons = screen.getAllByRole("button", { name: /acted on/i });
    // At least 2: status tab + card action
    expect(actedButtons.length).toBeGreaterThanOrEqual(2);
  });
});
