import { Navigate } from "react-router-dom";
import { useAuth } from "../store/AuthContext";
import HamsterLoader from "../components/common/HamsterLoader";

const ProtectedRoute = ({ children, roles }) => {
  const {
    isAuthenticated, user,
    loading,
  } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <HamsterLoader size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  if (roles && !roles.includes(user?.role)) return <Navigate to="/dashboard" replace />;

  return children;
};

export default ProtectedRoute;
