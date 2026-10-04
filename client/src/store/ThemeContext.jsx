import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

const THEME_STORAGE_KEY = "yakiuo-theme";
const ThemeContext = createContext(null);

const getInitialTheme = () => {
  try {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
  } catch {
    // Continue with the system preference when storage is unavailable.
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export const ThemeProvider = ({ children }) => {
  const location = useLocation();
  const [themeMode, setThemeMode] = useState(getInitialTheme);
  const isLoginPage = location.pathname === "/login";
  const isDark = themeMode === "dark" && !isLoginPage;

  useEffect(() => {
    const effectiveTheme = isLoginPage ? "light" : themeMode;
    document.documentElement.dataset.theme = effectiveTheme;
    document.documentElement.style.colorScheme = effectiveTheme;
    if (isLoginPage) return;

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    } catch {
      // The selected theme still works for the current session.
    }
  }, [isLoginPage, themeMode]);

  const value = useMemo(() => ({
    isDark,
    toggleTheme: () => setThemeMode((current) => current === "dark" ? "light" : "dark"),
  }), [isDark]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
};
