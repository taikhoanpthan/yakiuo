import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "../components/layout/Layout";
import ProtectedRoute from "./ProtectedRoute";
import FeatureRoute from "./FeatureRoute";

const Login = lazy(() => import("../pages/auth/Login"));
const Dashboard = lazy(() => import("../pages/dashboard/Dashboard"));
const Users = lazy(() => import("../pages/users/Users"));
const Feedback = lazy(() => import("../pages/feedback/Feedback"));
const Notifications = lazy(() => import("../pages/notifications/Notifications"));
const Profile = lazy(() => import("../pages/profile/Profile"));
const Todos = lazy(() => import("../pages/todos/Todos"));
const UserActivityHistory = lazy(() => import("../pages/admin/UserActivityHistory"));
const LateFeedbackEntries = lazy(() => import("../pages/admin/LateFeedbackEntries"));
const Cfs = lazy(() => import("../pages/cfs/Cfs"));
const Maintenance = lazy(() => import("../pages/maintenance/Maintenance"));
const Caro = lazy(() => import("../pages/caro/Caro"));

const PageLoader = () => <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-400">Đang tải...</div>;
const page = (Page) => <Suspense fallback={<PageLoader />}><Page /></Suspense>;
const featurePage = (Page, feature, roles) => <ProtectedRoute roles={roles}><FeatureRoute feature={feature}>{page(Page)}</FeatureRoute></ProtectedRoute>;

const AppRouter = () => (
  <Routes>
    <Route path="/login" element={page(Login)} />
    <Route path="/maintenance" element={page(Maintenance)} />
    <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={page(Dashboard)} />
      <Route path="/users" element={page(Users)} />
      <Route path="/feedback" element={page(Feedback)} />
      <Route path="/notifications" element={page(Notifications)} />
      <Route path="/profile" element={page(Profile)} />
      <Route path="/todos" element={page(Todos)} />
      <Route path="/admin/user-activity" element={<ProtectedRoute roles={["admin"]}>{page(UserActivityHistory)}</ProtectedRoute>} />
      <Route path="/admin/late-feedbacks" element={<ProtectedRoute roles={["admin"]}>{page(LateFeedbackEntries)}</ProtectedRoute>} />
      <Route path="/cfs" element={featurePage(Cfs, "cfs")} />
      <Route path="/cfs/:postId" element={featurePage(Cfs, "cfs")} />
      <Route path="/caro" element={featurePage(Caro, "caro", ["admin", "employee", "premium"])} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Route>
  </Routes>
);

export default AppRouter;
