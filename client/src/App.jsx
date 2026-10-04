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
          colorPrimary: "#2563eb",
          borderRadius: 10,
          colorText: isDark ? "#e6edf8" : "#26344e",
          colorBorder: isDark ? "#2a3955" : "#e5eaf2",
          colorBgBase: isDark ? "#111a2b" : "#ffffff",
          colorBgContainer: isDark ? "#151f33" : "#ffffff",
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        },

        components: {
          Card: {
            paddingLG: 20,
          },

          Table: {
            headerBg: isDark ? "#1d2a42" : "#f8faff",
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
