import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock sonner
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

// Track mutation calls
const mockUpdateProfile = vi.fn();
const mockUpdatePreferences = vi.fn();
const mockExportData = vi.fn();
const mockDeleteAccount = vi.fn();
const mockUpdateCreatorProfile = vi.fn();

vi.mock("@/lib/queries/settings", () => ({
  useSettings: vi.fn(() => ({
    data: {
      profile: {
        id: "u1",
        full_name: "Jane Doe",
        email: "jane@test.com",
        avatar_url: null,
        bio: "Content creator",
        website: "https://jane.dev",
        timezone: "America/New_York",
      },
      preferences: {
        publishing: {
          auto_save_drafts: true,
          confirm_before_publish: true,
          delete_confirmation: true,
        },
        ai: {
          enabled: true,
          auto_classify: true,
          content_suggestions: true,
          insights_enabled: true,
          writing_style: "match_my_style",
          custom_instructions: "",
        },
        notifications: {
          email_enabled: true,
          weekly_digest: true,
          digest_day: "monday",
          post_published_email: false,
          post_failed_email: true,
          connection_issues_email: true,
          insights_available_email: true,
          inapp_enabled: true,
          inapp_post_published: true,
          inapp_post_failed: true,
          inapp_new_insights: true,
        },
        appearance: {
          theme: "system",
          compact_mode: false,
          show_metrics_inline: true,
        },
        privacy: {
          analytics_collection: true,
          error_reporting: true,
        },
      },
    },
    isLoading: false,
  })),
  useUpdateProfile: vi.fn(() => ({
    mutate: mockUpdateProfile,
    isPending: false,
  })),
  useUpdatePreferences: vi.fn(() => ({
    mutate: mockUpdatePreferences,
    isPending: false,
  })),
  useExportData: vi.fn(() => ({
    mutate: mockExportData,
    isPending: false,
  })),
  useDeleteAccount: vi.fn(() => ({
    mutate: mockDeleteAccount,
    isPending: false,
  })),
  useCreatorProfile: vi.fn(() => ({
    data: {
      profile: {
        niches: ["tech_software", "marketing"],
        goals: ["build_authority"],
        target_audience: "SaaS founders",
      },
    },
    isLoading: false,
  })),
  useUpdateCreatorProfile: vi.fn(() => ({
    mutate: mockUpdateCreatorProfile,
    isPending: false,
  })),
}));

const mockSetTheme = vi.fn();
vi.mock("@/components/theme-provider", () => ({
  useTheme: vi.fn(() => ({
    theme: "dark",
    resolvedTheme: "dark",
    setTheme: mockSetTheme,
  })),
}));

vi.mock("@/lib/queries/connections", () => ({
  useConnections: vi.fn(() => ({
    data: [
      {
        id: "c1",
        platform: "twitter",
        platform_username: "janedoe",
        status: "active",
      },
    ],
    isLoading: false,
  })),
}));

import SettingsPage from "./page";
import { useSettings } from "@/lib/queries/settings";

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

function renderSettings() {
  return render(<SettingsPage />, { wrapper: createWrapper() });
}

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ─── Page Header & Navigation ───

  it("renders page heading", () => {
    renderSettings();
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Manage your account, preferences, and app behavior.",
      ),
    ).toBeInTheDocument();
  });

  it("renders all section navigation buttons", () => {
    renderSettings();
    const labels = [
      "Profile",
      "Creator Profile",
      "Account",
      "Platforms",
      "Publishing",
      "AI & Intelligence",
      "Notifications",
      "Appearance",
      "Data & Privacy",
      "About",
    ];
    for (const label of labels) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("defaults to Profile section", () => {
    renderSettings();
    expect(screen.getByText("Your personal information")).toBeInTheDocument();
  });

  it("navigates between sections via side nav", () => {
    renderSettings();
    fireEvent.click(screen.getByRole("button", { name: "Account" }));
    expect(
      screen.getByText("Account management and security"),
    ).toBeInTheDocument();
  });

  // ─── Loading State ───

  it("shows skeleton when loading", () => {
    vi.mocked(useSettings).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useSettings>);

    const { container } = renderSettings();
    // Skeleton renders 3 cards with skeleton elements
    const skeletons = container.querySelectorAll("[class*='animate-pulse']");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  // ─── Profile Section ───

  it("displays profile info", () => {
    renderSettings();
    expect(screen.getByDisplayValue("Jane Doe")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Content creator")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://jane.dev")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("America/New_York"),
    ).toBeInTheDocument();
  });

  it("shows avatar initials when no image", () => {
    renderSettings();
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("shows character count for bio", () => {
    renderSettings();
    expect(screen.getByText("15/500")).toBeInTheDocument();
  });

  it("debounces profile save on name change", async () => {
    renderSettings();
    const nameInput = screen.getByDisplayValue("Jane Doe");
    fireEvent.change(nameInput, { target: { value: "Jane Smith" } });

    // Not called yet (debounce)
    expect(mockUpdateProfile).not.toHaveBeenCalled();

    // Advance past debounce
    vi.advanceTimersByTime(900);

    expect(mockUpdateProfile).toHaveBeenCalledWith(
      { full_name: "Jane Smith" },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
  });

  it("debounces profile save on bio change", async () => {
    renderSettings();
    const bioInput = screen.getByDisplayValue("Content creator");
    fireEvent.change(bioInput, { target: { value: "New bio" } });

    vi.advanceTimersByTime(900);

    expect(mockUpdateProfile).toHaveBeenCalledWith(
      { bio: "New bio" },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
  });

  // ─── Account Section ───

  it("shows email and auth status", () => {
    renderSettings();
    fireEvent.click(screen.getByRole("button", { name: "Account" }));
    expect(screen.getByText("jane@test.com")).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
  });

  it("opens delete account modal", () => {
    renderSettings();
    fireEvent.click(screen.getByRole("button", { name: "Account" }));
    fireEvent.click(screen.getByText("Delete Account"));
    expect(
      screen.getByText(
        "This will permanently delete your account, all posts, metrics, connections, and AI data. This action cannot be undone.",
      ),
    ).toBeInTheDocument();
  });

  it("delete button disabled until DELETE typed", () => {
    renderSettings();
    fireEvent.click(screen.getByRole("button", { name: "Account" }));
    fireEvent.click(screen.getByText("Delete Account"));

    const confirmBtn = screen.getByText("Delete permanently");
    expect(confirmBtn).toBeDisabled();

    const input = screen.getByPlaceholderText("DELETE");
    fireEvent.change(input, { target: { value: "DELETE" } });
    expect(confirmBtn).toBeEnabled();
  });

  it("calls deleteAccount on confirm", () => {
    renderSettings();
    fireEvent.click(screen.getByRole("button", { name: "Account" }));
    fireEvent.click(screen.getByText("Delete Account"));

    fireEvent.change(screen.getByPlaceholderText("DELETE"), {
      target: { value: "DELETE" },
    });
    fireEvent.click(screen.getByText("Delete permanently"));

    expect(mockDeleteAccount).toHaveBeenCalledWith(
      { confirmation: "DELETE" },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
  });

  it("cancels delete modal", () => {
    renderSettings();
    fireEvent.click(screen.getByRole("button", { name: "Account" }));
    fireEvent.click(screen.getByText("Delete Account"));

    expect(screen.getByText("Delete permanently")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByText("Delete permanently")).not.toBeInTheDocument();
  });

  // ─── Platforms Section ───

  it("shows connected Twitter account", () => {
    renderSettings();
    fireEvent.click(screen.getByRole("button", { name: "Platforms" }));
    expect(screen.getByText("@janedoe")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("shows coming soon platforms", () => {
    renderSettings();
    fireEvent.click(screen.getByRole("button", { name: "Platforms" }));
    const comingSoon = screen.getAllByText("Coming soon");
    expect(comingSoon.length).toBeGreaterThanOrEqual(2);
  });

  it("has link to manage connections", () => {
    renderSettings();
    fireEvent.click(screen.getByRole("button", { name: "Platforms" }));
    const link = screen.getByText(/Manage all connections/);
    expect(link.closest("a")).toHaveAttribute(
      "href",
      "/dashboard/connections",
    );
  });

  // ─── Publishing Section ───

  it("renders publishing toggles", () => {
    renderSettings();
    fireEvent.click(screen.getByRole("button", { name: "Publishing" }));
    expect(screen.getByText("Auto-save drafts")).toBeInTheDocument();
    expect(screen.getByText("Confirm before publish")).toBeInTheDocument();
    expect(screen.getByText("Delete confirmation")).toBeInTheDocument();
  });

  it("calls updatePreferences when toggling publishing setting", () => {
    renderSettings();
    fireEvent.click(screen.getByRole("button", { name: "Publishing" }));

    // Toggle auto-save drafts (currently on)
    const switches = screen.getAllByRole("switch");
    fireEvent.click(switches[0]);

    expect(mockUpdatePreferences).toHaveBeenCalledWith(
      { section: "publishing", settings: { auto_save_drafts: false } },
      expect.objectContaining({ onError: expect.any(Function) }),
    );
  });

  // ─── AI Section ───

  it("renders AI toggles and controls", () => {
    renderSettings();
    fireEvent.click(
      screen.getByRole("button", { name: "AI & Intelligence" }),
    );
    expect(screen.getByText("Enable AI features")).toBeInTheDocument();
    expect(screen.getByText("Auto-classify posts")).toBeInTheDocument();
    expect(screen.getByText("Content suggestions")).toBeInTheDocument();
    expect(screen.getByText("AI insights")).toBeInTheDocument();
    expect(screen.getByText("Writing style")).toBeInTheDocument();
    expect(screen.getByText("Custom instructions")).toBeInTheDocument();
  });

  it("toggles AI master switch", () => {
    renderSettings();
    fireEvent.click(
      screen.getByRole("button", { name: "AI & Intelligence" }),
    );

    const switches = screen.getAllByRole("switch");
    // First switch is "Enable AI features"
    fireEvent.click(switches[0]);

    expect(mockUpdatePreferences).toHaveBeenCalledWith(
      { section: "ai", settings: { enabled: false } },
      expect.objectContaining({ onError: expect.any(Function) }),
    );
  });

  it("updates writing style", () => {
    renderSettings();
    fireEvent.click(
      screen.getByRole("button", { name: "AI & Intelligence" }),
    );

    const select = screen.getByDisplayValue("Match my style");
    fireEvent.change(select, { target: { value: "professional" } });

    expect(mockUpdatePreferences).toHaveBeenCalledWith(
      { section: "ai", settings: { writing_style: "professional" } },
      expect.objectContaining({ onError: expect.any(Function) }),
    );
  });

  it("debounces custom instructions", () => {
    renderSettings();
    fireEvent.click(
      screen.getByRole("button", { name: "AI & Intelligence" }),
    );

    const textarea = screen.getByPlaceholderText(
      /Keep posts under 200 characters/,
    );
    fireEvent.change(textarea, { target: { value: "Be concise" } });

    expect(mockUpdatePreferences).not.toHaveBeenCalled();

    vi.advanceTimersByTime(900);

    expect(mockUpdatePreferences).toHaveBeenCalledWith(
      {
        section: "ai",
        settings: { custom_instructions: "Be concise" },
      },
      expect.objectContaining({ onError: expect.any(Function) }),
    );
  });

  // ─── Notifications Section ───

  it("renders notification toggles", () => {
    renderSettings();
    fireEvent.click(
      screen.getByRole("button", { name: "Notifications" }),
    );
    expect(screen.getByText("Email notifications")).toBeInTheDocument();
    expect(screen.getByText("Weekly digest")).toBeInTheDocument();
    expect(screen.getByText("In-app notifications")).toBeInTheDocument();
  });

  it("toggles email notification master switch", () => {
    renderSettings();
    fireEvent.click(
      screen.getByRole("button", { name: "Notifications" }),
    );

    const switches = screen.getAllByRole("switch");
    // First switch is "Email notifications"
    fireEvent.click(switches[0]);

    expect(mockUpdatePreferences).toHaveBeenCalledWith(
      { section: "notifications", settings: { email_enabled: false } },
      expect.objectContaining({ onError: expect.any(Function) }),
    );
  });

  it("changes digest day", () => {
    renderSettings();
    fireEvent.click(
      screen.getByRole("button", { name: "Notifications" }),
    );

    const select = screen.getByDisplayValue("Monday");
    fireEvent.change(select, { target: { value: "friday" } });

    expect(mockUpdatePreferences).toHaveBeenCalledWith(
      { section: "notifications", settings: { digest_day: "friday" } },
      expect.objectContaining({ onError: expect.any(Function) }),
    );
  });

  // ─── Appearance Section ───

  it("renders theme selector", () => {
    renderSettings();
    fireEvent.click(screen.getByRole("button", { name: "Appearance" }));
    expect(screen.getByText("Light")).toBeInTheDocument();
    expect(screen.getByText("Dark")).toBeInTheDocument();
    expect(screen.getByText("System")).toBeInTheDocument();
  });

  it("selects dark theme and calls setTheme", () => {
    renderSettings();
    fireEvent.click(screen.getByRole("button", { name: "Appearance" }));
    fireEvent.click(screen.getByText("Dark"));

    expect(mockUpdatePreferences).toHaveBeenCalledWith(
      { section: "appearance", settings: { theme: "dark" } },
      expect.objectContaining({ onError: expect.any(Function) }),
    );
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("selects light theme and calls setTheme", () => {
    renderSettings();
    fireEvent.click(screen.getByRole("button", { name: "Appearance" }));
    fireEvent.click(screen.getByText("Light"));

    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });

  it("toggles compact mode", () => {
    renderSettings();
    fireEvent.click(screen.getByRole("button", { name: "Appearance" }));

    const switches = screen.getAllByRole("switch");
    // First switch is compact mode
    fireEvent.click(switches[0]);

    expect(mockUpdatePreferences).toHaveBeenCalledWith(
      { section: "appearance", settings: { compact_mode: true } },
      expect.objectContaining({ onError: expect.any(Function) }),
    );
  });

  // ─── Data & Privacy Section ───

  it("renders export buttons", () => {
    renderSettings();
    fireEvent.click(
      screen.getByRole("button", { name: "Data & Privacy" }),
    );
    expect(screen.getByText("Export all data")).toBeInTheDocument();
    expect(screen.getByText("Export posts")).toBeInTheDocument();
    expect(screen.getByText("Export analytics")).toBeInTheDocument();
  });

  it("calls export with correct type", () => {
    renderSettings();
    fireEvent.click(
      screen.getByRole("button", { name: "Data & Privacy" }),
    );
    fireEvent.click(screen.getByText("Export posts"));

    expect(mockExportData).toHaveBeenCalledWith(
      { type: "posts", format: "json" },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
  });

  it("renders privacy toggles", () => {
    renderSettings();
    fireEvent.click(
      screen.getByRole("button", { name: "Data & Privacy" }),
    );
    expect(screen.getByText("Analytics collection")).toBeInTheDocument();
    expect(screen.getByText("Error reporting")).toBeInTheDocument();
  });

  it("toggles analytics collection", () => {
    renderSettings();
    fireEvent.click(
      screen.getByRole("button", { name: "Data & Privacy" }),
    );

    const switches = screen.getAllByRole("switch");
    // First switch in this section is analytics collection
    fireEvent.click(switches[0]);

    expect(mockUpdatePreferences).toHaveBeenCalledWith(
      { section: "privacy", settings: { analytics_collection: false } },
      expect.objectContaining({ onError: expect.any(Function) }),
    );
  });

  it("has delete account in data section too", () => {
    renderSettings();
    fireEvent.click(
      screen.getByRole("button", { name: "Data & Privacy" }),
    );
    expect(screen.getByText("Danger Zone")).toBeInTheDocument();
    expect(screen.getByText("Delete Account")).toBeInTheDocument();
  });

  it("data section delete modal works", () => {
    renderSettings();
    fireEvent.click(
      screen.getByRole("button", { name: "Data & Privacy" }),
    );
    fireEvent.click(screen.getByText("Delete Account"));

    expect(
      screen.getByText(
        "This is irreversible. All your data will be permanently deleted.",
      ),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("DELETE"), {
      target: { value: "DELETE" },
    });
    fireEvent.click(screen.getByText("Delete permanently"));

    expect(mockDeleteAccount).toHaveBeenCalledWith(
      { confirmation: "DELETE" },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
  });

  // ─── Creator Profile Section ───

  it("renders creator profile section with niches and goals", () => {
    renderSettings();
    fireEvent.click(
      screen.getByRole("button", { name: "Creator Profile" }),
    );
    expect(
      screen.getByText("Your content niches, goals, and audience"),
    ).toBeInTheDocument();
    // Check selected niches are shown
    expect(screen.getByTestId("niche-chip-tech_software")).toHaveAttribute(
      "data-selected",
      "true",
    );
    expect(screen.getByTestId("niche-chip-marketing")).toHaveAttribute(
      "data-selected",
      "true",
    );
    expect(screen.getByTestId("niche-chip-design")).toHaveAttribute(
      "data-selected",
      "false",
    );
  });

  it("toggles niche chip in creator profile settings", () => {
    renderSettings();
    fireEvent.click(
      screen.getByRole("button", { name: "Creator Profile" }),
    );

    // Click design to add it
    fireEvent.click(screen.getByTestId("niche-chip-design"));

    expect(mockUpdateCreatorProfile).toHaveBeenCalledWith(
      { niches: ["tech_software", "marketing", "design"] },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
  });

  it("toggles goal in creator profile settings", () => {
    renderSettings();
    fireEvent.click(
      screen.getByRole("button", { name: "Creator Profile" }),
    );

    // Click "Grow audience" to add it
    fireEvent.click(screen.getByTestId("goal-chip-grow_audience"));

    expect(mockUpdateCreatorProfile).toHaveBeenCalledWith(
      { goals: ["build_authority", "grow_audience"] },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
  });

  it("debounces target audience update", () => {
    renderSettings();
    fireEvent.click(
      screen.getByRole("button", { name: "Creator Profile" }),
    );

    const input = screen.getByDisplayValue("SaaS founders");
    fireEvent.change(input, { target: { value: "Indie hackers" } });

    expect(mockUpdateCreatorProfile).not.toHaveBeenCalled();

    vi.advanceTimersByTime(900);

    expect(mockUpdateCreatorProfile).toHaveBeenCalledWith(
      { target_audience: "Indie hackers" },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
  });

  // ─── About Section ───

  it("renders about section info", () => {
    renderSettings();
    fireEvent.click(screen.getByRole("button", { name: "About" }));
    expect(screen.getByText("1.0.0")).toBeInTheDocument();
    expect(
      screen.getByText("support@creatorgrowthos.com"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Built for creators who want to grow intentionally.",
      ),
    ).toBeInTheDocument();
  });
});
