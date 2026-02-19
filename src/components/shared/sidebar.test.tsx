import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useSearchParams: () => ({ get: () => null, toString: () => "" }),
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/lib/queries/user", () => ({
  useCurrentUser: () => ({ data: null, isLoading: false }),
}));

vi.mock("@/lib/queries/connections", () => ({
  useConnections: () => ({
    data: [
      { id: "1", platform: "twitter", platform_username: "alice", status: "active" },
    ],
    isLoading: false,
  }),
}));

import { Sidebar } from "./sidebar";

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    React.createElement(QueryClientProvider, { client: queryClient }, ui),
  );
}

describe("Sidebar", () => {
  it("renders platform selector in desktop sidebar", () => {
    renderWithProviders(<Sidebar />);
    // PlatformSelector shows platform name — will appear in desktop sidebar
    expect(screen.getAllByText("X").length).toBeGreaterThanOrEqual(1);
  });

  it("does not render Connections nav item", () => {
    renderWithProviders(<Sidebar />);
    const connectionsLinks = screen.queryAllByRole("link", { name: /^Connections$/i });
    expect(connectionsLinks).toHaveLength(0);
  });

  it("renders Dashboard nav item", () => {
    renderWithProviders(<Sidebar />);
    // Desktop + mobile = 2 instances
    expect(screen.getAllByText("Dashboard").length).toBeGreaterThanOrEqual(1);
  });

  it("renders Content nav item", () => {
    renderWithProviders(<Sidebar />);
    expect(screen.getAllByText("Content").length).toBeGreaterThanOrEqual(1);
  });
});
