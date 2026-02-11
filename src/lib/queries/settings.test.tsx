import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

import {
  useSettings,
  useUpdateProfile,
  useUpdatePreferences,
  useExportData,
  useDeleteAccount,
  useCreatorProfile,
  useUpdateCreatorProfile,
  settingsKeys,
  creatorProfileKeys,
} from "./settings";

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

describe("settings query hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            profile: { id: "u1", full_name: "Test" },
            preferences: {},
          }),
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("has correct query key structure", () => {
    expect(settingsKeys.all).toEqual(["settings"]);
  });

  it("useSettings fetches settings", async () => {
    const { result } = renderHook(() => useSettings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.profile.full_name).toBe("Test");
  });

  it("useUpdateProfile calls PATCH /api/settings/profile", async () => {
    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ full_name: "New Name" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith("/api/settings/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: "New Name" }),
    });
  });

  it("useUpdatePreferences calls PATCH /api/settings/preferences", async () => {
    const { result } = renderHook(() => useUpdatePreferences(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ section: "ai", settings: { enabled: false } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith("/api/settings/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "ai", settings: { enabled: false } }),
    });
  });

  it("useExportData calls POST /api/settings/export", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { posts: [] } }),
    } as Response);

    const { result } = renderHook(() => useExportData(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ type: "all", format: "json" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith("/api/settings/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "all", format: "json" }),
    });
  });

  it("useDeleteAccount calls POST /api/settings/delete-account", async () => {
    const { result } = renderHook(() => useDeleteAccount(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ confirmation: "DELETE" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith("/api/settings/delete-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation: "DELETE" }),
    });
  });

  it("has correct creatorProfile query key structure", () => {
    expect(creatorProfileKeys.all).toEqual(["creator-profile"]);
  });

  it("useCreatorProfile fetches creator profile", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          profile: {
            niches: ["tech_software"],
            goals: ["build_authority"],
            target_audience: "SaaS founders",
          },
        }),
    } as Response);

    const { result } = renderHook(() => useCreatorProfile(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.profile.niches).toEqual(["tech_software"]);
    expect(fetch).toHaveBeenCalledWith("/api/settings/creator-profile");
  });

  it("useUpdateCreatorProfile calls PATCH /api/settings/creator-profile", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          profile: {
            niches: ["design", "creative"],
            goals: ["build_authority"],
            target_audience: "SaaS founders",
          },
        }),
    } as Response);

    const { result } = renderHook(() => useUpdateCreatorProfile(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ niches: ["design", "creative"] });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith("/api/settings/creator-profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ niches: ["design", "creative"] }),
    });
  });
});
