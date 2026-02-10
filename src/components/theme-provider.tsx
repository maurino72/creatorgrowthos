"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContext {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContext | undefined>(undefined);

const STORAGE_KEY = "theme-preference";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") return getSystemTheme();
  return theme;
}

function applyTheme(resolved: "light" | "dark") {
  if (resolved === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "dark";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  // Apply theme to DOM whenever it changes
  useEffect(() => {
    applyTheme(resolveTheme(theme));
  }, [theme]);

  // Listen for system preference changes when in system mode
  useEffect(() => {
    if (theme !== "system") return;

    const mql = window.matchMedia("(prefers-color-scheme: light)");
    const handler = (e: MediaQueryListEvent | { matches: boolean }) => {
      applyTheme(e.matches ? "light" : "dark");
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler as EventListenerOrEventListenerObject);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    document.documentElement.classList.add("theme-transitioning");
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
    applyTheme(resolveTheme(newTheme));
    setTimeout(() => {
      document.documentElement.classList.remove("theme-transitioning");
    }, 250);
  };

  return (
    <ThemeContext
      value={{
        theme,
        resolvedTheme: resolveTheme(theme),
        setTheme,
      }}
    >
      {children}
    </ThemeContext>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
