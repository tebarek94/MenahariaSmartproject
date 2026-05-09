import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";

const ThemeContext = createContext(null);

const STORAGE_KEY = "theme";
const LEGACY_ADMIN_KEY = "admin_theme_mode";
const LEGACY_DRIVER_KEY = "driver_theme_mode";

function readStoredTheme() {
  try {
    const t = localStorage.getItem(STORAGE_KEY);
    if (t === "light" || t === "dark") return { mode: t, isSystem: false };
    const legacy =
      localStorage.getItem(LEGACY_ADMIN_KEY) ||
      localStorage.getItem(LEGACY_DRIVER_KEY);
    if (legacy === "light" || legacy === "dark") {
      localStorage.setItem(STORAGE_KEY, legacy);
      return { mode: legacy, isSystem: false };
    }
  } catch {
    // ignore
  }
  const prefersLight =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: light)")?.matches;
  return { mode: prefersLight ? "light" : "dark", isSystem: true };
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const initial = useMemo(() => readStoredTheme(), []);

  const [theme, setTheme] = useState(initial.mode);
  const [isSystem, setIsSystem] = useState(initial.isSystem);

  const applyTheme = useCallback((themeValue) => {
    const root = document.documentElement;
    if (themeValue === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute(
        "content",
        themeValue === "dark" ? "#0f172a" : "#f2f2f2",
      );
    }
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  useEffect(() => {
    if (!isSystem) return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handleChange = (e) => {
      setTheme(e.matches ? "light" : "dark");
    };
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, [isSystem]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // no-op
      }
      return next;
    });
    setIsSystem(false);
  }, []);

  const setThemeMode = useCallback((mode) => {
    if (mode !== "light" && mode !== "dark") return;
    setTheme(mode);
    setIsSystem(false);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // no-op
    }
  }, []);

  const setSystemTheme = useCallback(() => {
    setIsSystem(true);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // no-op
    }
    const prefersLight = window.matchMedia("(prefers-color-scheme: light)")
      .matches;
    setTheme(prefersLight ? "light" : "dark");
  }, []);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === "dark",
      isLight: theme === "light",
      isSystem,
      toggleTheme,
      setThemeMode,
      setSystemTheme,
    }),
    [theme, isSystem, toggleTheme, setThemeMode, setSystemTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};
