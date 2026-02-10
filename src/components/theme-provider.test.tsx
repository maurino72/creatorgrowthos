import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ThemeProvider, useTheme } from "./theme-provider";

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
    // Remove dark class from documentElement
    document.documentElement.classList.remove("dark");

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
    document.documentElement.classList.remove("dark");
  });

  it("defaults to dark theme", () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme").textContent).toBe("dark");
    expect(screen.getByTestId("resolved").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("removes dark class when theme is light", () => {
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
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("adds dark class when switching back to dark", () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    act(() => {
      screen.getByText("Set Light").click();
    });
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    act(() => {
      screen.getByText("Set Dark").click();
    });
    expect(document.documentElement.classList.contains("dark")).toBe(true);
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
    expect(document.documentElement.classList.contains("dark")).toBe(false);
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
    expect(document.documentElement.classList.contains("dark")).toBe(true);
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
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("adds theme-transitioning class during theme switch and removes after timeout", () => {
    vi.useFakeTimers();

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    act(() => {
      screen.getByText("Set Light").click();
    });

    expect(
      document.documentElement.classList.contains("theme-transitioning"),
    ).toBe(true);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(
      document.documentElement.classList.contains("theme-transitioning"),
    ).toBe(false);

    vi.useRealTimers();
  });

});
