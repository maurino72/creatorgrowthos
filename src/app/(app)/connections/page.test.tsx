import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
  useRouter: vi.fn(() => ({
    replace: vi.fn(),
  })),
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
  Toaster: () => null,
}));

// Mock the hooks
vi.mock("@/lib/queries/connections", () => ({
  useConnections: vi.fn(),
  useDisconnect: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  connectionKeys: {
    all: ["connections"],
    byPlatform: (p: string) => ["connections", p],
  },
}));

vi.mock("@/lib/queries/billing", () => ({
  useSubscription: vi.fn(),
  billingKeys: {
    all: ["billing"],
    subscription: ["billing", "subscription"],
  },
}));

import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useConnections } from "@/lib/queries/connections";
import { useSubscription } from "@/lib/queries/billing";

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

describe("Connections page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams() as never,
    );
    // Default: business plan
    vi.mocked(useSubscription).mockReturnValue({
      data: { plan: "business", status: "active" },
      isLoading: false,
    } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders page title", async () => {
    vi.mocked(useConnections).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText("Connections")).toBeInTheDocument();
  });

  it("shows loading skeletons while fetching", async () => {
    vi.mocked(useConnections).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getAllByTestId("connection-skeleton").length).toBeGreaterThan(0);
  });

  it("renders Twitter card with Connect button when disconnected", async () => {
    vi.mocked(useConnections).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText("X")).toBeInTheDocument();
    const connectLinks = screen.getAllByRole("link", { name: /connect/i });
    const twitterLink = connectLinks.find(
      (l) => (l as HTMLAnchorElement).href.includes("twitter"),
    );
    expect(twitterLink).toBeDefined();
  });

  it("renders connected state with username and Disconnect button", async () => {
    vi.mocked(useConnections).mockReturnValue({
      data: [
        {
          id: "conn-1",
          platform: "twitter",
          platform_username: "testuser",
          platform_user_id: "tw-123",
          status: "active",
          connected_at: "2024-01-01T00:00:00Z",
          token_expires_at: null,
          scopes: null,
          last_synced_at: null,
        },
      ],
      isLoading: false,
      isError: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText("@testuser")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /disconnect/i })).toBeInTheDocument();
  });

  it("shows expired badge for expired connections", async () => {
    vi.mocked(useConnections).mockReturnValue({
      data: [
        {
          id: "conn-1",
          platform: "twitter",
          platform_username: "testuser",
          platform_user_id: "tw-123",
          status: "expired",
          connected_at: "2024-01-01T00:00:00Z",
          token_expires_at: null,
          scopes: null,
          last_synced_at: null,
        },
      ],
      isLoading: false,
      isError: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText("Expired")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /reconnect/i })).toBeInTheDocument();
  });

  it("shows coming soon state only for Threads", async () => {
    vi.mocked(useConnections).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText("Threads")).toBeInTheDocument();
    expect(screen.getAllByText("Coming Soon")).toHaveLength(1);
  });

  it("shows success toast when connected param is present", async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams("connected=twitter") as never,
    );
    vi.mocked(useConnections).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(toast.success).toHaveBeenCalledWith("X connected successfully!");
  });

  it("shows error toast when error param is present", async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams("error=access_denied") as never,
    );
    vi.mocked(useConnections).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(toast.error).toHaveBeenCalled();
  });

  // ── LinkedIn-specific tests ──

  it("shows LinkedIn Connect button for business plan users", async () => {
    vi.mocked(useSubscription).mockReturnValue({
      data: { plan: "business", status: "active" },
      isLoading: false,
    } as never);
    vi.mocked(useConnections).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText("LinkedIn")).toBeInTheDocument();
    // LinkedIn should have a Connect link, not Coming Soon
    const linkedinLinks = screen.getAllByRole("link", { name: /connect/i });
    const linkedinLink = linkedinLinks.find(
      (l) => (l as HTMLAnchorElement).href.includes("linkedin"),
    );
    expect(linkedinLink).toBeDefined();
  });

  it("shows upgrade prompt for starter plan users on LinkedIn", async () => {
    vi.mocked(useSubscription).mockReturnValue({
      data: { plan: "starter", status: "active" },
      isLoading: false,
    } as never);
    vi.mocked(useConnections).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText("LinkedIn")).toBeInTheDocument();
    expect(screen.getByText(/Upgrade/i)).toBeInTheDocument();
  });

  it("shows LinkedIn connected state with name (no @ prefix)", async () => {
    vi.mocked(useConnections).mockReturnValue({
      data: [
        {
          id: "conn-2",
          platform: "linkedin",
          platform_username: "John Smith",
          platform_user_id: "li-abc",
          status: "active",
          connected_at: "2024-01-01T00:00:00Z",
          token_expires_at: null,
          scopes: null,
          last_synced_at: null,
        },
      ],
      isLoading: false,
      isError: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    // LinkedIn should show name without @ prefix
    expect(screen.getByText("John Smith")).toBeInTheDocument();
    expect(screen.queryByText("@John Smith")).not.toBeInTheDocument();
  });

  it("shows plan_required error toast", async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams("error=plan_required") as never,
    );
    vi.mocked(useConnections).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(toast.error).toHaveBeenCalledWith(
      "This platform requires a Business plan or higher.",
    );
  });

  it("shows LinkedIn success toast when connected=linkedin", async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams("connected=linkedin") as never,
    );
    vi.mocked(useConnections).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(toast.success).toHaveBeenCalledWith(
      "LinkedIn connected successfully!",
    );
  });
});
