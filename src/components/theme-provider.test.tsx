import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ThemeProvider, useTheme } from "./theme-provider";

// Mock useSettings from react-query
vi.mock("@/lib/queries/settings", () => ({
  useSettings: vi.fn(() => ({ data: null, isLoading: false })),
  settingsKeys: { all: ["settings"] },
}));

function TestConsumer() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button onClick={() => setTheme("light")}>Set Light</button>
      <button onClick={() => setTheme("dark")}>Set Dark</button>
      <button onClick={() => setTheme("system")}>Set System</button>
    </div>
  );
}

describe("ThemeProvider", () => {
  let matchMediaListeners: Map<string, ((e: { matches: boolean }) => void)[]>;

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    // Remove light class from documentElement
    document.documentElement.classList.remove("light");

    matchMediaListeners = new Map();

    // Mock matchMedia
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(
          (_: string, cb: (e: { matches: boolean }) => void) => {
            const listeners = matchMediaListeners.get(query) || [];
            listeners.push(cb);
            matchMediaListeners.set(query, listeners);
          },
        ),
        removeEventListener: vi.fn(),
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    document.documentElement.classList.remove("light");
  });

  it("defaults to dark theme", () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme").textContent).toBe("dark");
    expect(screen.getByTestId("resolved").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("light")).toBe(false);
  });

  it("applies light class when theme is light", () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    act(() => {
      screen.getByText("Set Light").click();
    });

    expect(screen.getByTestId("theme").textContent).toBe("light");
    expect(screen.getByTestId("resolved").textContent).toBe("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });

  it("removes light class when switching back to dark", () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    act(() => {
      screen.getByText("Set Light").click();
    });
    expect(document.documentElement.classList.contains("light")).toBe(true);

    act(() => {
      screen.getByText("Set Dark").click();
    });
    expect(document.documentElement.classList.contains("light")).toBe(false);
  });

  it("persists theme to localStorage", () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    act(() => {
      screen.getByText("Set Light").click();
    });

    expect(localStorage.getItem("theme-preference")).toBe("light");
  });

  it("reads theme from localStorage on mount", () => {
    localStorage.setItem("theme-preference", "light");

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme").textContent).toBe("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });

  it("resolves system preference to dark when prefers-color-scheme is dark", () => {
    // matchMedia returns matches: false for light query (meaning dark)
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    act(() => {
      screen.getByText("Set System").click();
    });

    expect(screen.getByTestId("theme").textContent).toBe("system");
    expect(screen.getByTestId("resolved").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("light")).toBe(false);
  });

  it("resolves system preference to light when prefers-color-scheme is light", () => {
    // Override matchMedia to return light preference
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn((query: string) => ({
        matches: query === "(prefers-color-scheme: light)",
        media: query,
        addEventListener: vi.fn(
          (_: string, cb: (e: { matches: boolean }) => void) => {
            const listeners = matchMediaListeners.get(query) || [];
            listeners.push(cb);
            matchMediaListeners.set(query, listeners);
          },
        ),
        removeEventListener: vi.fn(),
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    act(() => {
      screen.getByText("Set System").click();
    });

    expect(screen.getByTestId("theme").textContent).toBe("system");
    expect(screen.getByTestId("resolved").textContent).toBe("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });

  it("uses DB preference when available", async () => {
    const { useSettings } = await import("@/lib/queries/settings");
    vi.mocked(useSettings).mockReturnValue({
      data: { preferences: { appearance: { theme: "light" } } },
      isLoading: false,
    } as ReturnType<typeof useSettings>);

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme").textContent).toBe("light");
  });

  it("ignores 'system' from DB to preserve dark-first default", async () => {
    const { useSettings } = await import("@/lib/queries/settings");
    vi.mocked(useSettings).mockReturnValue({
      data: { preferences: { appearance: { theme: "system" } } },
      isLoading: false,
    } as ReturnType<typeof useSettings>);

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    // Should stay dark, not switch to system
    expect(screen.getByTestId("theme").textContent).toBe("dark");
  });

  it("prioritizes localStorage over DB preference for instant hydration", async () => {
    localStorage.setItem("theme-preference", "dark");

    const { useSettings } = await import("@/lib/queries/settings");
    vi.mocked(useSettings).mockReturnValue({
      data: { preferences: { appearance: { theme: "light" } } },
      isLoading: false,
    } as ReturnType<typeof useSettings>);

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    // localStorage wins for instant hydration
    expect(screen.getByTestId("theme").textContent).toBe("dark");
  });
});
