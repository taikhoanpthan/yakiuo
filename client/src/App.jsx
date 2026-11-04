import { BrowserRouter } from "react-router-dom";
import { ConfigProvider, theme as antdTheme } from "antd";
import { QueryClientProvider } from "@tanstack/react-query";

import { AuthProvider } from "./store/AuthContext";
import AppRouter from "./routes/AppRouter";
import { queryClient } from "./lib/queryClient";
import { ThemeProvider, useTheme } from "./store/ThemeContext";

function AppContent() {
  const { isDark } = useTheme();

  return (
    <QueryClientProvider client={queryClient}>
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: isDark ? "#c9965a" : "#875b35",
          colorInfo: isDark ? "#c9965a" : "#875b35",
          colorText: isDark ? "#f0e7dc" : "#3f3025",
          colorTextSecondary: isDark ? "#c8b8a8" : "#76675a",
          colorBorder: isDark ? "#4f4035" : "#dfd1c1",
          colorBgBase: isDark ? "#211914" : "#f5f0e9",
          colorBgContainer: isDark ? "#2b211b" : "#fffdfa",
          colorBgElevated: isDark ? "#33271f" : "#fffaf5",
          colorFillAlter: isDark ? "#382b23" : "#f3ebe2",
          borderRadius: 12,
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        },

        components: {
          Card: {
            paddingLG: 20,
          },

          Table: {
            headerBg: isDark ? "#382b23" : "#f4ede5",
          },
        },
      }}
    >
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ConfigProvider>
    </QueryClientProvider>
  );
}

function App() {
  return <BrowserRouter><ThemeProvider><AppContent /></ThemeProvider></BrowserRouter>;
}

export default App;
