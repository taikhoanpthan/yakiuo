import { Navigate } from "react-router-dom";
import { useAuth } from "../store/AuthContext";
import HamsterLoader from "../components/common/HamsterLoader";

const ProtectedRoute = ({ children }) => {
  const {
    isAuthenticated,
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

  return children;
};

export default ProtectedRoute;
