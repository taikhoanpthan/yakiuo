import { Navigate, Route, Routes } from "react-router-dom";

import Login from "../pages/auth/Login";
import Dashboard from "../pages/dashboard/Dashboard";
import Users from "../pages/users/Users";
import Feedback from "../pages/feedback/Feedback";
import Notifications from "../pages/notifications/Notifications";
import Profile from "../pages/profile/Profile";
import Todos from "../pages/todos/Todos";

import Layout from "../components/layout/Layout";
import ProtectedRoute from "./ProtectedRoute";
import ChatPage from "../pages/chat/ChatPage";

const AppRouter = () => {
  return (
    <Routes>
      {/* AUTH */}
      <Route path="/login" element={<Login />} />

      {/* DEFAULT */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* DASHBOARD */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* USERS */}
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <Layout>
              <Users />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* FEEDBACK */}
      <Route
        path="/feedback"
        element={
          <ProtectedRoute>
            <Layout>
              <Feedback />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* NOTIFICATIONS */}
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <Layout>
              <Notifications />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* PROFILE */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Layout>
              <Profile />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* TODOS */}
      <Route
        path="/todos"
        element={
          <ProtectedRoute>
            <Layout>
              <Todos />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* CHAT */}
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <Layout>
              <ChatPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <Layout>
              <ChatPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRouter;
