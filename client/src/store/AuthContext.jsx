import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  getMe,
  login as loginRequest,
  logout as logoutRequest,
} from "../services/auth.service";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const accessToken = localStorage.getItem("accessToken");

  const login = async (username, password) => {
    const result = await loginRequest(username, password);

    localStorage.setItem(
      "accessToken",
      result.data.accessToken
    );

    localStorage.setItem(
      "refreshToken",
      result.data.refreshToken
    );

    setUser(result.data.user);

    const me = await getMe();

    setUser(me.data.user);
    setPermissions(me.data.permissions || []);

    return result;
  };

  const logout = async () => {
    const refreshToken =
      localStorage.getItem("refreshToken");

    try {
      if (refreshToken) {
        await logoutRequest(refreshToken);
      }
    } catch (error) {
      console.error("Logout error:", error);
    }

    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");

    setUser(null);
    setPermissions([]);
  };

  // Cập nhật user ngay lập tức sau khi sửa profile/avatar
  const updateUser = (updatedUser) => {
    setUser((currentUser) => ({
      ...currentUser,
      ...updatedUser,
    }));
  };

  const hasPermission = (permission) => {
    return permissions.includes(permission);
  };

  useEffect(() => {
    const initializeAuth = async () => {
      if (!accessToken) {
        setLoading(false);
        return;
      }

      try {
        const result = await getMe();

        setUser(result.data.user);
        setPermissions(
          result.data.permissions || []
        );
      } catch (error) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");

        setUser(null);
        setPermissions([]);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        updateUser,
        permissions,
        loading,
        login,
        logout,
        hasPermission,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
};