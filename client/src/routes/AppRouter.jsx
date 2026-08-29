import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import Layout from "../components/layout/Layout";
import ProtectedRoute from "./ProtectedRoute";

const Login = lazy(() => import("../pages/auth/Login"));
const Dashboard = lazy(() => import("../pages/dashboard/Dashboard"));
const Users = lazy(() => import("../pages/users/Users"));
const Feedback = lazy(() => import("../pages/feedback/Feedback"));
const Notifications = lazy(() => import("../pages/notifications/Notifications"));
const Profile = lazy(() => import("../pages/profile/Profile"));
const Todos = lazy(() => import("../pages/todos/Todos"));
const ChatPage = lazy(() => import("../pages/chat/ChatPage"));

const PageLoader = () => (
  <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-400">
    Đang tải...
  </div>
);

const renderProtectedPage = (Page) => (
  <ProtectedRoute>
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <Page />
      </Suspense>
    </Layout>
  </ProtectedRoute>
);

const AppRouter = () => {
  return (
    <Routes>
      {/* AUTH */}
      <Route
        path="/login"
        element={
          <Suspense fallback={<PageLoader />}>
            <Login />
          </Suspense>
        }
      />

      {/* DEFAULT */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* DASHBOARD */}
      <Route
        path="/dashboard"
        element={renderProtectedPage(Dashboard)}
      />

      {/* USERS */}
      <Route
        path="/users"
        element={renderProtectedPage(Users)}
      />

      {/* FEEDBACK */}
      <Route
        path="/feedback"
        element={renderProtectedPage(Feedback)}
      />

      {/* NOTIFICATIONS */}
      <Route
        path="/notifications"
        element={renderProtectedPage(Notifications)}
      />

      {/* PROFILE */}
      <Route
        path="/profile"
        element={renderProtectedPage(Profile)}
      />

      {/* TODOS */}
      <Route
        path="/todos"
        element={renderProtectedPage(Todos)}
      />

      {/* CHAT */}
      <Route
        path="/chat"
        element={renderProtectedPage(ChatPage)}
      />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRouter;
