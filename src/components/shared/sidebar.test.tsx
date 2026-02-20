import { describe, it, expect, vi } from "vitest";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const mockPathname = vi.fn(() => "/x/dashboard");

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
  useParams: () => ({ platform: "x" }),
  useRouter: () => ({ push: vi.fn() }),
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

const mockPrefetchDashboard = vi.fn();
const mockPrefetchContent = vi.fn();
const mockPrefetchInsights = vi.fn();
const mockPrefetchExperiments = vi.fn();

vi.mock("@/lib/queries/prefetch", () => ({
  prefetchDashboard: (...args: unknown[]) => mockPrefetchDashboard(...args),
  prefetchContent: (...args: unknown[]) => mockPrefetchContent(...args),
  prefetchInsights: (...args: unknown[]) => mockPrefetchInsights(...args),
  prefetchExperiments: (...args: unknown[]) => mockPrefetchExperiments(...args),
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
    expect(screen.getAllByText("X").length).toBeGreaterThanOrEqual(1);
  });

  it("renders Dashboard nav item with platform slug", () => {
    renderWithProviders(<Sidebar />);
    const dashboardLinks = screen.getAllByText("Dashboard");
    expect(dashboardLinks.length).toBeGreaterThanOrEqual(1);
    // Verify link points to /x/dashboard
    const link = dashboardLinks[0].closest("a");
    expect(link?.getAttribute("href")).toBe("/x/dashboard");
  });

  it("renders Content nav item with platform slug", () => {
    renderWithProviders(<Sidebar />);
    const contentLinks = screen.getAllByText("Content");
    expect(contentLinks.length).toBeGreaterThanOrEqual(1);
    const link = contentLinks[0].closest("a");
    expect(link?.getAttribute("href")).toBe("/x/content");
  });

  it("renders Insights nav item with platform slug", () => {
    renderWithProviders(<Sidebar />);
    const insightsLinks = screen.getAllByText("Insights");
    expect(insightsLinks.length).toBeGreaterThanOrEqual(1);
    const link = insightsLinks[0].closest("a");
    expect(link?.getAttribute("href")).toBe("/x/insights");
  });

  it("renders Experiments nav item with platform slug", () => {
    renderWithProviders(<Sidebar />);
    const links = screen.getAllByText("Experiments");
    expect(links.length).toBeGreaterThanOrEqual(1);
    const link = links[0].closest("a");
    expect(link?.getAttribute("href")).toBe("/x/experiments");
  });

  // Settings (/settings) and Billing (/settings/billing) are static links in
  // a Radix DropdownMenu — they render only when the menu is open, which is
  // difficult to test in jsdom. The URLs are verified as static constants in
  // the sidebar source code and covered by E2E tests.

  it("highlights active nav item for exact match", () => {
    mockPathname.mockReturnValue("/x/content");
    renderWithProviders(<Sidebar />);
    const contentLinks = screen.getAllByText("Content");
    const link = contentLinks[0].closest("a");
    expect(link?.className).toContain("border-l-2");
  });

  it("highlights Content for nested path /x/content/new", () => {
    mockPathname.mockReturnValue("/x/content/new");
    renderWithProviders(<Sidebar />);
    const contentLinks = screen.getAllByText("Content");
    const link = contentLinks[0].closest("a");
    expect(link?.className).toContain("border-l-2");
  });

  it("does not render Connections nav item", () => {
    renderWithProviders(<Sidebar />);
    const connectionsLinks = screen.queryAllByRole("link", { name: /^Connections$/i });
    expect(connectionsLinks).toHaveLength(0);
  });

  it("prefetches dashboard data on hover", async () => {
    renderWithProviders(<Sidebar />);
    const dashboardLinks = screen.getAllByText("Dashboard");
    fireEvent.mouseEnter(dashboardLinks[0].closest("a")!);
    expect(mockPrefetchDashboard).toHaveBeenCalled();
  });

  it("prefetches content data on hover", async () => {
    renderWithProviders(<Sidebar />);
    const contentLinks = screen.getAllByText("Content");
    fireEvent.mouseEnter(contentLinks[0].closest("a")!);
    expect(mockPrefetchContent).toHaveBeenCalled();
  });

  it("prefetches insights data on hover", async () => {
    renderWithProviders(<Sidebar />);
    const insightsLinks = screen.getAllByText("Insights");
    fireEvent.mouseEnter(insightsLinks[0].closest("a")!);
    expect(mockPrefetchInsights).toHaveBeenCalled();
  });

  it("prefetches experiments data on hover", async () => {
    renderWithProviders(<Sidebar />);
    const links = screen.getAllByText("Experiments");
    fireEvent.mouseEnter(links[0].closest("a")!);
    expect(mockPrefetchExperiments).toHaveBeenCalled();
  });
});
