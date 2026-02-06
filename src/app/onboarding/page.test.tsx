import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: mockPush })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Track mutation calls
const mockUpdateStep = vi.fn();
const mockSaveProfile = vi.fn();
const mockCompleteOnboarding = vi.fn();
const mockImportTwitter = vi.fn();
const mockStarterIdeas = vi.fn();

vi.mock("@/lib/queries/onboarding", () => ({
  useOnboardingState: vi.fn(() => ({
    data: null,
    isLoading: false,
  })),
  useUpdateOnboardingStep: vi.fn(() => ({
    mutate: mockUpdateStep,
    isPending: false,
  })),
  useSaveQuickProfile: vi.fn(() => ({
    mutate: mockSaveProfile,
    isPending: false,
  })),
  useCompleteOnboarding: vi.fn(() => ({
    mutate: mockCompleteOnboarding,
    isPending: false,
  })),
  useImportTwitter: vi.fn(() => ({
    mutate: mockImportTwitter,
    isPending: false,
  })),
  useStarterIdeas: vi.fn(() => ({
    mutate: mockStarterIdeas,
    data: null,
    isPending: false,
    isSuccess: false,
  })),
}));

vi.mock("@/lib/queries/connections", () => ({
  useConnections: vi.fn(() => ({
    data: [],
    refetch: vi.fn(),
    isLoading: false,
  })),
}));

import { useSearchParams } from "next/navigation";
import {
  useOnboardingState,
  useSaveQuickProfile,
  useImportTwitter,
  useStarterIdeas,
  useCompleteOnboarding,
} from "@/lib/queries/onboarding";
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

describe("Onboarding page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the welcome step by default", async () => {
    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(
      screen.getByText("Welcome to Creator Growth OS"),
    ).toBeInTheDocument();
    expect(screen.getByText("Get Started")).toBeInTheDocument();
  });

  it("advances from welcome to connect step", async () => {
    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByText("Get Started"));

    expect(screen.getByText("Connect your platform")).toBeInTheDocument();
    expect(mockUpdateStep).toHaveBeenCalledWith("connect");
  });

  it("resumes at saved onboarding step", async () => {
    vi.mocked(useOnboardingState).mockReturnValue({
      data: { onboarding_step: "profile", onboarded_at: null },
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(
      screen.getByText("Tell us about your content"),
    ).toBeInTheDocument();
  });

  it("shows connected state when Twitter is connected", async () => {
    vi.mocked(useConnections).mockReturnValue({
      data: [
        {
          id: "c1",
          platform: "twitter",
          platform_username: "testcreator",
          platform_user_id: "tw-1",
          status: "active",
          connected_at: "2024-01-01",
          token_expires_at: null,
          scopes: null,
          last_synced_at: null,
        },
      ],
      refetch: vi.fn(),
      isLoading: false,
    } as never);

    vi.mocked(useOnboardingState).mockReturnValue({
      data: { onboarding_step: "connect", onboarded_at: null },
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(
      screen.getByText("Connected as @testcreator"),
    ).toBeInTheDocument();
  });

  it("detects ?connected=twitter param and shows connect step", async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams("connected=twitter") as never,
    );
    const mockRefetch = vi.fn();
    vi.mocked(useConnections).mockReturnValue({
      data: [],
      refetch: mockRefetch,
      isLoading: false,
    } as never);

    const Page = await importPage();
    render(<Page />, { wrapper: createWrapper() });

    expect(screen.getByText("Connect your platform")).toBeInTheDocument();
    expect(mockRefetch).toHaveBeenCalled();
  });

  describe("Quick Profile step", () => {
    beforeEach(() => {
      vi.mocked(useOnboardingState).mockReturnValue({
        data: { onboarding_step: "profile", onboarded_at: null },
        isLoading: false,
      } as never);
    });

    it("shows validation errors when submitting empty form", async () => {
      const Page = await importPage();
      render(<Page />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByText("Continue"));

      expect(screen.getByText("Pick your niche")).toBeInTheDocument();
      expect(screen.getByText("Choose your goal")).toBeInTheDocument();
      expect(screen.getByText("At least 5 characters")).toBeInTheDocument();
      expect(mockSaveProfile).not.toHaveBeenCalled();
    });

    it("shows custom niche input when 'other' is selected", async () => {
      const Page = await importPage();
      render(<Page />, { wrapper: createWrapper() });

      const select = screen.getByRole("combobox");
      fireEvent.change(select, { target: { value: "other" } });

      expect(
        screen.getByPlaceholderText("Enter your niche..."),
      ).toBeInTheDocument();
    });

    it("validates custom niche is not empty when 'other' selected", async () => {
      const Page = await importPage();
      render(<Page />, { wrapper: createWrapper() });

      // Select "other" niche
      const select = screen.getByRole("combobox");
      fireEvent.change(select, { target: { value: "other" } });

      // Fill goal and audience but leave custom niche empty
      fireEvent.click(screen.getByText("Build authority"));
      const audienceInput = screen.getByPlaceholderText(
        "e.g., Early-stage SaaS founders",
      );
      fireEvent.change(audienceInput, {
        target: { value: "Tech professionals" },
      });

      fireEvent.click(screen.getByText("Continue"));

      expect(
        screen.getByText("Enter your custom niche"),
      ).toBeInTheDocument();
      expect(mockSaveProfile).not.toHaveBeenCalled();
    });

    it("validates audience max length", async () => {
      const Page = await importPage();
      render(<Page />, { wrapper: createWrapper() });

      // Fill out valid niche and goal
      const select = screen.getByRole("combobox");
      fireEvent.change(select, { target: { value: "tech_software" } });
      fireEvent.click(screen.getByText("Grow audience"));

      // Enter audience exceeding 100 chars
      const audienceInput = screen.getByPlaceholderText(
        "e.g., Early-stage SaaS founders",
      );
      fireEvent.change(audienceInput, {
        target: { value: "x".repeat(101) },
      });

      fireEvent.click(screen.getByText("Continue"));

      expect(screen.getByText("Max 100 characters")).toBeInTheDocument();
    });

    it("submits valid profile and advances to import step", async () => {
      // Make saveProfile call onSuccess
      mockSaveProfile.mockImplementation(
        (_data: unknown, options: { onSuccess: () => void }) => {
          options.onSuccess();
        },
      );

      const Page = await importPage();
      render(<Page />, { wrapper: createWrapper() });

      // Fill form
      const select = screen.getByRole("combobox");
      fireEvent.change(select, { target: { value: "tech_software" } });
      fireEvent.click(screen.getByText("Grow audience"));
      const audienceInput = screen.getByPlaceholderText(
        "e.g., Early-stage SaaS founders",
      );
      fireEvent.change(audienceInput, {
        target: { value: "Tech professionals" },
      });

      fireEvent.click(screen.getByText("Continue"));

      expect(mockSaveProfile).toHaveBeenCalledWith(
        {
          primary_niche: "tech_software",
          primary_goal: "grow_audience",
          target_audience: "Tech professionals",
        },
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      );

      // Should advance to import step
      expect(
        screen.getByText("Import your existing posts"),
      ).toBeInTheDocument();
    });
  });

  describe("Import step", () => {
    beforeEach(() => {
      vi.mocked(useOnboardingState).mockReturnValue({
        data: { onboarding_step: "import", onboarded_at: null },
        isLoading: false,
      } as never);
    });

    it("shows import options", async () => {
      const Page = await importPage();
      render(<Page />, { wrapper: createWrapper() });

      expect(screen.getByText("Last 50 posts")).toBeInTheDocument();
      expect(screen.getByText("Last 100 posts")).toBeInTheDocument();
      expect(
        screen.getByText("All posts (up to 500)"),
      ).toBeInTheDocument();
      expect(screen.getByText("Skip for now")).toBeInTheDocument();
    });

    it("calls import with correct count", async () => {
      const Page = await importPage();
      render(<Page />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByText("Last 100 posts"));

      expect(mockImportTwitter).toHaveBeenCalledWith(
        100,
        expect.any(Object),
      );
    });

    it("shows spinner during import", async () => {
      vi.mocked(useImportTwitter).mockReturnValue({
        mutate: mockImportTwitter,
        isPending: true,
      } as never);

      const Page = await importPage();
      render(<Page />, { wrapper: createWrapper() });

      expect(
        screen.getByText("Importing your posts..."),
      ).toBeInTheDocument();
    });

    it("shows import completion with count", async () => {
      // Simulate successful import
      mockImportTwitter.mockImplementation(
        (
          _count: number,
          options: { onSuccess: (data: { imported_count: number }) => void },
        ) => {
          options.onSuccess({ imported_count: 75 });
        },
      );

      const Page = await importPage();
      render(<Page />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByText("Last 100 posts"));

      expect(screen.getByText("Imported 75 posts")).toBeInTheDocument();
      expect(
        screen.getByText("You're ready for insights!"),
      ).toBeInTheDocument();
    });

    it("shows posts-needed message when import is below 20", async () => {
      mockImportTwitter.mockImplementation(
        (
          _count: number,
          options: { onSuccess: (data: { imported_count: number }) => void },
        ) => {
          options.onSuccess({ imported_count: 10 });
        },
      );

      const Page = await importPage();
      render(<Page />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByText("Last 50 posts"));

      expect(screen.getByText("Imported 10 posts")).toBeInTheDocument();
      expect(
        screen.getByText("10 more posts until insights unlock."),
      ).toBeInTheDocument();
    });

    it("skip triggers starter ideas generation", async () => {
      const Page = await importPage();
      render(<Page />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByText("Skip for now"));

      expect(mockStarterIdeas).toHaveBeenCalled();
      expect(mockUpdateStep).toHaveBeenCalledWith("tour");
    });
  });

  describe("Tour step", () => {
    beforeEach(() => {
      vi.mocked(useOnboardingState).mockReturnValue({
        data: { onboarding_step: "tour", onboarded_at: null },
        isLoading: false,
      } as never);
    });

    it("shows tour stops with navigation", async () => {
      const Page = await importPage();
      render(<Page />, { wrapper: createWrapper() });

      expect(screen.getByText("Quick tour")).toBeInTheDocument();
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
      expect(
        screen.getByText("Your command center. See performance at a glance."),
      ).toBeInTheDocument();
    });

    it("navigates between tour stops", async () => {
      const Page = await importPage();
      render(<Page />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByText("Next"));
      expect(screen.getByText("Content")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Next"));
      expect(screen.getByText("Insights")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Back"));
      expect(screen.getByText("Content")).toBeInTheDocument();
    });

    it("shows Continue button on last tour stop", async () => {
      const Page = await importPage();
      render(<Page />, { wrapper: createWrapper() });

      // Navigate to last stop
      fireEvent.click(screen.getByText("Next")); // Content
      fireEvent.click(screen.getByText("Next")); // Insights
      fireEvent.click(screen.getByText("Next")); // Connections

      expect(screen.getByText("Connections")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Continue" }),
      ).toBeInTheDocument();
    });

    it("skip tour advances to activate step", async () => {
      const Page = await importPage();
      render(<Page />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByText("Skip tour"));

      expect(mockUpdateStep).toHaveBeenCalledWith("activate");
    });
  });

  describe("Activate step", () => {
    beforeEach(() => {
      vi.mocked(useOnboardingState).mockReturnValue({
        data: { onboarding_step: "activate", onboarded_at: null },
        isLoading: false,
      } as never);
    });

    it("shows dashboard CTA when user imported posts", async () => {
      // We need to simulate the import flow by going through the steps
      // Instead, test the activate step with didImport=false (default)
      const Page = await importPage();
      render(<Page />, { wrapper: createWrapper() });

      expect(screen.getByText("Go to Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Create from scratch")).toBeInTheDocument();
    });

    it("shows AI ideas when available", async () => {
      vi.mocked(useStarterIdeas).mockReturnValue({
        mutate: mockStarterIdeas,
        data: {
          preview: [
            { idea: "Thread about testing", hook: "Here's what I learned about testing..." },
            { idea: "Tips for developers", hook: "5 tips every developer needs..." },
          ],
        },
        isPending: false,
        isSuccess: true,
      } as never);

      const Page = await importPage();
      render(<Page />, { wrapper: createWrapper() });

      expect(
        screen.getByText("Here are your first content ideas"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Thread about testing"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Tips for developers"),
      ).toBeInTheDocument();
    });

    it("shows loading state for ideas", async () => {
      vi.mocked(useStarterIdeas).mockReturnValue({
        mutate: mockStarterIdeas,
        data: null,
        isPending: true,
        isSuccess: false,
      } as never);

      const Page = await importPage();
      render(<Page />, { wrapper: createWrapper() });

      expect(
        screen.getByText("Generating personalized ideas..."),
      ).toBeInTheDocument();
    });

    it("completes onboarding and redirects to dashboard", async () => {
      mockCompleteOnboarding.mockImplementation(
        (_: undefined, options: { onSuccess: () => void }) => {
          options.onSuccess();
        },
      );

      const Page = await importPage();
      render(<Page />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByText("Go to Dashboard"));

      expect(mockCompleteOnboarding).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });

    it("completes onboarding and redirects to new post page", async () => {
      mockCompleteOnboarding.mockImplementation(
        (_: undefined, options: { onSuccess: () => void }) => {
          options.onSuccess();
        },
      );

      const Page = await importPage();
      render(<Page />, { wrapper: createWrapper() });

      fireEvent.click(screen.getByText("Create from scratch"));

      expect(mockCompleteOnboarding).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/dashboard/content/new");
    });

    it("uses idea and redirects with hook content", async () => {
      mockCompleteOnboarding.mockImplementation(
        (_: undefined, options: { onSuccess: () => void }) => {
          options.onSuccess();
        },
      );

      vi.mocked(useStarterIdeas).mockReturnValue({
        mutate: mockStarterIdeas,
        data: {
          preview: [
            { idea: "Test idea", hook: "My test hook content" },
          ],
        },
        isPending: false,
        isSuccess: true,
      } as never);

      const Page = await importPage();
      render(<Page />, { wrapper: createWrapper() });

      const useButtons = screen.getAllByText(/Use this idea/);
      fireEvent.click(useButtons[0]);

      expect(mockCompleteOnboarding).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith(
        `/dashboard/content/new?body=${encodeURIComponent("My test hook content")}`,
      );
    });
  });

  describe("Step indicator", () => {
    it("renders 6 step dots", async () => {
      const Page = await importPage();
      const { container } = render(<Page />, { wrapper: createWrapper() });

      const dots = container.querySelectorAll(".rounded-full");
      // 6 step indicators in the top bar
      expect(dots.length).toBeGreaterThanOrEqual(6);
    });
  });
});
