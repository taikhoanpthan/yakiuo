import { BrowserRouter } from "react-router-dom";
import { ConfigProvider } from "antd";
import { QueryClientProvider } from "@tanstack/react-query";

import { AuthProvider } from "./store/AuthContext";
import AppRouter from "./routes/AppRouter";
import { queryClient } from "./lib/queryClient";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#2563eb",
          borderRadius: 10,
          colorText: "#26344e",
          colorBorder: "#e5eaf2",
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        },

        components: {
          Card: {
            paddingLG: 20,
          },

          Table: {
            headerBg: "#f8faff",
          },
        },
      }}
    >
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </BrowserRouter>
    </ConfigProvider>
    </QueryClientProvider>
  );
}

export default App;
