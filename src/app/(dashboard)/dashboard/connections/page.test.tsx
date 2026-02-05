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

import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useConnections } from "@/lib/queries/connections";

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

    expect(screen.getByText("Twitter")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /connect/i })).toBeInTheDocument();
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

  it("shows coming soon state for LinkedIn and Threads", async () => {
    vi.mocked(useConnections).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText("LinkedIn")).toBeInTheDocument();
    expect(screen.getByText("Threads")).toBeInTheDocument();
    expect(screen.getAllByText("Coming Soon")).toHaveLength(2);
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

    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining("Twitter"),
    );
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
});
