import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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

describe("Sidebar", () => {
  it("renders platform selector in desktop sidebar", () => {
    render(<Sidebar />);
    // PlatformSelector shows platform name — will appear in desktop sidebar
    expect(screen.getAllByText("X").length).toBeGreaterThanOrEqual(1);
  });

  it("does not render Connections nav item", () => {
    render(<Sidebar />);
    const connectionsLinks = screen.queryAllByRole("link", { name: /^Connections$/i });
    expect(connectionsLinks).toHaveLength(0);
  });

  it("renders Dashboard nav item", () => {
    render(<Sidebar />);
    // Desktop + mobile = 2 instances
    expect(screen.getAllByText("Dashboard").length).toBeGreaterThanOrEqual(1);
  });

  it("renders Content nav item", () => {
    render(<Sidebar />);
    expect(screen.getAllByText("Content").length).toBeGreaterThanOrEqual(1);
  });
});
