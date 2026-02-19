import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import React from "react";

const mockSetPlatform = vi.fn();

vi.mock("@/lib/hooks/use-platform", () => ({
  usePlatform: vi.fn(),
}));

import { PlatformSelector } from "./platform-selector";
import { usePlatform } from "@/lib/hooks/use-platform";

// Radix portals require pointer events in jsdom
function openDropdown() {
  const trigger = screen.getByRole("button");
  fireEvent.pointerDown(trigger, { pointerType: "mouse", button: 0 });
  fireEvent.pointerUp(trigger, { pointerType: "mouse", button: 0 });
  fireEvent.click(trigger);
}

describe("PlatformSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders selected platform name and icon", () => {
    vi.mocked(usePlatform).mockReturnValue({
      platform: "twitter",
      setPlatform: mockSetPlatform,
      activeConnections: [
        { id: "1", platform: "twitter", platform_username: "alice", status: "active", platform_user_id: null, connected_at: null, last_synced_at: null, token_expires_at: null, scopes: null },
      ],
      isLoading: false,
      hasConnections: true,
    });

    render(<PlatformSelector />);

    expect(screen.getByText("X")).toBeInTheDocument();
    expect(screen.getByTestId("platform-twitter")).toBeInTheDocument();
  });

  it("shows dropdown with connections on click", async () => {
    vi.mocked(usePlatform).mockReturnValue({
      platform: "twitter",
      setPlatform: mockSetPlatform,
      activeConnections: [
        { id: "1", platform: "twitter", platform_username: "alice", status: "active", platform_user_id: null, connected_at: null, last_synced_at: null, token_expires_at: null, scopes: null },
        { id: "2", platform: "linkedin", platform_username: "bob", status: "active", platform_user_id: null, connected_at: null, last_synced_at: null, token_expires_at: null, scopes: null },
      ],
      isLoading: false,
      hasConnections: true,
    });

    render(<PlatformSelector />);

    await act(async () => openDropdown());

    await waitFor(() => {
      expect(screen.getByText("@alice")).toBeInTheDocument();
      expect(screen.getByText("@bob")).toBeInTheDocument();
    });
  });

  it("calls setPlatform when selecting a different platform", async () => {
    vi.mocked(usePlatform).mockReturnValue({
      platform: "twitter",
      setPlatform: mockSetPlatform,
      activeConnections: [
        { id: "1", platform: "twitter", platform_username: "alice", status: "active", platform_user_id: null, connected_at: null, last_synced_at: null, token_expires_at: null, scopes: null },
        { id: "2", platform: "linkedin", platform_username: "bob", status: "active", platform_user_id: null, connected_at: null, last_synced_at: null, token_expires_at: null, scopes: null },
      ],
      isLoading: false,
      hasConnections: true,
    });

    render(<PlatformSelector />);

    await act(async () => openDropdown());

    await waitFor(() => {
      expect(screen.getByText("LinkedIn")).toBeInTheDocument();
    });

    const linkedinItem = screen.getByText("LinkedIn");
    fireEvent.click(linkedinItem);

    expect(mockSetPlatform).toHaveBeenCalledWith("linkedin");
  });

  it("shows empty state when no connections", () => {
    vi.mocked(usePlatform).mockReturnValue({
      platform: null,
      setPlatform: mockSetPlatform,
      activeConnections: [],
      isLoading: false,
      hasConnections: false,
    });

    render(<PlatformSelector />);

    expect(screen.getByText("Connect a platform")).toBeInTheDocument();
  });

  it("shows manage connections link in dropdown", async () => {
    vi.mocked(usePlatform).mockReturnValue({
      platform: "twitter",
      setPlatform: mockSetPlatform,
      activeConnections: [
        { id: "1", platform: "twitter", platform_username: "alice", status: "active", platform_user_id: null, connected_at: null, last_synced_at: null, token_expires_at: null, scopes: null },
      ],
      isLoading: false,
      hasConnections: true,
    });

    render(<PlatformSelector />);

    await act(async () => openDropdown());

    await waitFor(() => {
      expect(screen.getByText("Manage connections")).toBeInTheDocument();
    });
  });
});
