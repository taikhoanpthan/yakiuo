import { BrowserRouter } from "react-router-dom";
import { ConfigProvider } from "antd";

import { AuthProvider } from "./store/AuthContext";
import AppRouter from "./routes/AppRouter";

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#3977f6",
          borderRadius: 10,
          colorText: "#26344e",
          colorBorder: "#e5eaf2",
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        },
        components: { Card: { paddingLG: 20 }, Table: { headerBg: "#f8faff" } },
      }}
    >
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
