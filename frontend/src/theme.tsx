import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

import { saveSettings } from "./api";

export type ThemePreference = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => Promise<void>;
  syncTheme: (theme: ThemePreference) => void;
  toggleTheme: () => Promise<void>;
  pending: boolean;
}

interface ThemeProviderProps {
  children: ReactNode;
}

const THEME_STORAGE_KEY = "dockauri-theme";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function readCachedTheme(): ThemePreference {
  if (typeof window === "undefined") {
    return "dark";
  }

  const cached = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (cached === "light" || cached === "dark" || cached === "system") {
    return cached;
  }

  return "dark";
}

function resolveTheme(theme: ThemePreference): ResolvedTheme {
  if (theme === "system") {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }

    return "light";
  }

  return theme;
}

function applyTheme(theme: ThemePreference): void {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  const resolvedTheme = resolveTheme(theme);

  root.classList.remove("theme-light", "theme-dark", "dark");

  if (resolvedTheme === "light") {
    root.classList.add("theme-light");
  } else {
    root.classList.add("dark", "theme-dark");
  }

  root.dataset.themePreference = theme;
  root.dataset.themeResolved = resolvedTheme;
}

export function ThemeProvider({ children }: ThemeProviderProps): JSX.Element {
  const [theme, setThemeState] = useState<ThemePreference>(readCachedTheme());
  const [pending, setPending] = useState(false);
  const resolvedTheme = useMemo(() => resolveTheme(theme), [theme]);

  useEffect(() => {
    applyTheme(theme);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [theme]);

  const setTheme = async (nextTheme: ThemePreference) => {
    const previousTheme = theme;
    setPending(true);
    setThemeState(nextTheme);

    try {
      await saveSettings({ theme: nextTheme });
    } catch (error) {
      setThemeState(previousTheme);
      throw error;
    } finally {
      setPending(false);
    }
  };

  const syncTheme = (nextTheme: ThemePreference) => {
    setThemeState(nextTheme);
  };

  const toggleTheme = async () => {
    await setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      syncTheme,
      toggleTheme,
      pending
    }),
    [theme, resolvedTheme, pending]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider.");
  }

  return context;
}
