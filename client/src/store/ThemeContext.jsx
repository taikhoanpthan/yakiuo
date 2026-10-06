import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

const ThemeContext = createContext(null);

const getThemeForCurrentTime = () => {
  const hour = new Date().getHours();
  return hour >= 18 || hour < 6 ? "dark" : "light";
};

const millisecondsUntilNextThemeChange = () => {
  const now = new Date();
  const nextChange = new Date(now);
  const hour = now.getHours();

  nextChange.setHours(hour >= 18 ? 6 : 18, 0, 0, 0);
  if (nextChange <= now) nextChange.setDate(nextChange.getDate() + 1);

  return nextChange.getTime() - now.getTime();
};

export const ThemeProvider = ({ children }) => {
  const location = useLocation();
  const [themeMode, setThemeMode] = useState(getThemeForCurrentTime);
  const isLoginPage = location.pathname === "/login";
  const isDark = themeMode === "dark" && !isLoginPage;

  useEffect(() => {
    const syncThemeWithTime = () => setThemeMode(getThemeForCurrentTime());
    const timeoutId = window.setTimeout(syncThemeWithTime, millisecondsUntilNextThemeChange());

    document.addEventListener("visibilitychange", syncThemeWithTime);
    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", syncThemeWithTime);
    };
  }, [themeMode]);

  useEffect(() => {
    const effectiveTheme = isLoginPage ? "light" : themeMode;
    document.documentElement.dataset.theme = effectiveTheme;
    document.documentElement.style.colorScheme = effectiveTheme;
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
