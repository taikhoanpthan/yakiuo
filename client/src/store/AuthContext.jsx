import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  getMe,
  login as loginRequest,
  logout as logoutRequest,
} from "../services/auth.service";

import {
  setSocketUser,
  leavePresence,
  disconnectSocket,
} from "../services/socket";
import { getSystemStatus } from "../services/system.service";

// =====================================================
// AUTH CONTEXT
// =====================================================

const AuthContext = createContext(null);

// =====================================================
// AUTH PROVIDER
// =====================================================

export const AuthProvider = ({ children }) => {
  // ===================================================
  // STATE
  // ===================================================

  const [user, setUser] = useState(null);

  const [permissions, setPermissions] = useState([]);

  const [loading, setLoading] = useState(true);

  // ===================================================
  // REFS
  // ===================================================

  /*
   * Dùng ref để tránh những lifecycle không cần thiết
   * làm socket join lại user nhiều lần.
   */
  const presenceUserRef = useRef(null);

  /*
   * Đánh dấu AuthProvider còn mounted hay không.
   */
  const mountedRef = useRef(true);

  // ===================================================
  // LOGIN
  // ===================================================

  const login = useCallback(async (username, password) => {
    console.log("🔐 AUTH LOGIN:", username);

    // -------------------------------------------------
    // LOGIN API
    // -------------------------------------------------

    const result = await loginRequest(username, password);

    const { accessToken, refreshToken, user: loginUser } = result.data || {};

    // -------------------------------------------------
    // Validate response
    // -------------------------------------------------

    if (!accessToken) {
      throw new Error("Không nhận được access token");
    }

    if (!refreshToken) {
      throw new Error("Không nhận được refresh token");
    }

    // -------------------------------------------------
    // Save token
    // -------------------------------------------------

    localStorage.setItem("accessToken", accessToken);

    localStorage.setItem("refreshToken", refreshToken);

    // -------------------------------------------------
    // Set user tạm thời
    //
    // KHÔNG gọi setSocketUser ở đây.
    //
    // Presence được xử lý tập trung bên dưới
    // bằng useEffect theo user.
    // -------------------------------------------------

    if (mountedRef.current) {
      setUser(loginUser || null);
    }

    // -------------------------------------------------
    // Lấy thông tin user mới nhất
    // -------------------------------------------------

    try {
      const me = await getMe();

      const currentUser = me?.data?.user || loginUser || null;

      const currentPermissions = Array.isArray(me?.data?.permissions)
        ? me.data.permissions
        : [];

      if (mountedRef.current) {
        setUser(currentUser);

        setPermissions(currentPermissions);
      }

      console.log("✅ AUTH LOGIN SUCCESS:", currentUser?._id);
    } catch (error) {
      console.error("❌ GET CURRENT USER AFTER LOGIN ERROR:", error);

      /*
       * Nếu login thành công nhưng getMe lỗi,
       * không nên giữ token rác.
       */

      localStorage.removeItem("accessToken");

      localStorage.removeItem("refreshToken");

      try {
        leavePresence();
      } catch (presenceError) {
        console.error("❌ Leave presence after login failure:", presenceError);
      }

      try {
        disconnectSocket();
      } catch (socketError) {
        console.error("❌ Disconnect socket after login failure:", socketError);
      }

      if (mountedRef.current) {
        setUser(null);
        setPermissions([]);
      }

      throw error;
    }

    return result;
  }, []);

  // ===================================================
  // LOGOUT
  // ===================================================
  const logout = useCallback(async () => {
    console.log("🔴 AUTH LOGOUT");

    const refreshToken = localStorage.getItem("refreshToken");

    // =================================================
    // 1. STOP SOCKET
    // =================================================

    try {
      console.log("🔴 STOP PRESENCE:", presenceUserRef.current);

      leavePresence();

      presenceUserRef.current = null;

      disconnectSocket();
    } catch (error) {
      console.error("❌ Socket logout error:", error);
    }

    // =================================================
    // 2. LOGOUT API
    // =================================================

    if (refreshToken) {
      try {
        await logoutRequest(refreshToken);

        console.log("✅ LOGOUT API SUCCESS");
      } catch (error) {
        console.error("⚠️ LOGOUT API ERROR:", error);
      }
    }

    // =================================================
    // 3. CLEAR TOKEN
    // =================================================

    localStorage.removeItem("accessToken");

    localStorage.removeItem("refreshToken");

    // =================================================
    // 4. CLEAR AUTH
    // =================================================

    if (mountedRef.current) {
      setUser(null);
      setPermissions([]);
    }

    console.log("✅ AUTH LOGOUT COMPLETE");
  }, []);

  // ===================================================
  // UPDATE USER
  // ===================================================

  const updateUser = useCallback((updatedUser) => {
    if (!updatedUser) {
      return;
    }

    setUser((currentUser) => {
      if (!currentUser) {
        return updatedUser;
      }

      return {
        ...currentUser,
        ...updatedUser,
      };
    });
  }, []);

  // ===================================================
  // PERMISSION
  // ===================================================

  const hasPermission = useCallback(
    (permission) => {
      if (!permission) {
        return false;
      }

      return permissions.includes(permission);
    },
    [permissions],
  );

  // ===================================================
  // INITIALIZE AUTH
  // ===================================================

  useEffect(() => {
    mountedRef.current = true;

    let cancelled = false;

    const initializeAuth = async () => {
      console.log("🔄 AUTH INITIALIZE");

      const accessToken = localStorage.getItem("accessToken");

      // -------------------------------------------------
      // Không có token
      // -------------------------------------------------

      if (!accessToken) {
        console.log("⚪ NO ACCESS TOKEN");

        if (!cancelled && mountedRef.current) {
          setUser(null);
          setPermissions([]);
          setLoading(false);
        }

        return;
      }

      // -------------------------------------------------
      // Có token → getMe
      // -------------------------------------------------

      try {
        const result = await getMe();

        if (cancelled || !mountedRef.current) {
          return;
        }

        const currentUser = result?.data?.user || null;

        const currentPermissions = Array.isArray(result?.data?.permissions)
          ? result.data.permissions
          : [];

        // -------------------------------------------------
        // Token hợp lệ
        // -------------------------------------------------

        if (currentUser?._id) {
          console.log("✅ AUTH RESTORED USER:", currentUser._id);

          setUser(currentUser);

          setPermissions(currentPermissions);
        } else {
          console.warn("⚠️ GET ME RETURNED NO USER");

          localStorage.removeItem("accessToken");

          localStorage.removeItem("refreshToken");

          setUser(null);
          setPermissions([]);
        }
      } catch (error) {
        console.error("❌ INITIALIZE AUTH ERROR:", error);

        // -------------------------------------------------
        // Token hết hạn / invalid
        // -------------------------------------------------

        localStorage.removeItem("accessToken");

        localStorage.removeItem("refreshToken");

        try {
          leavePresence();
        } catch (presenceError) {
          console.error("❌ Leave presence error:", presenceError);
        }

        try {
          disconnectSocket();
        } catch (socketError) {
          console.error("❌ Disconnect socket error:", socketError);
        }

        presenceUserRef.current = null;

        if (!cancelled && mountedRef.current) {
          setUser(null);
          setPermissions([]);
        }
      } finally {
        if (!cancelled && mountedRef.current) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  // Dự phòng cho socket: người dùng thường sẽ tự vào trang bảo trì ngay cả
  // khi vừa mất kết nối đúng lúc admin bật chế độ này.
  useEffect(() => {
    if (!user?._id || user.role === "admin") return undefined;
    let cancelled = false;
    const checkMaintenance = async () => {
      if (document.hidden) return;

      try {
        const response = await getSystemStatus();
        if (!cancelled && response.data?.data?.maintenanceMode) {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          disconnectSocket();
          window.location.assign("/maintenance");
        }
      } catch { /* Sự cố mạng không được xem là bảo trì. */ }
    };
    checkMaintenance();
    const timer = window.setInterval(checkMaintenance, 60000);
    document.addEventListener("visibilitychange", checkMaintenance);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", checkMaintenance);
    };
  }, [user?._id, user?.role]);

  // ===================================================
  // PRESENCE
  //
  // ĐÂY LÀ NƠI DUY NHẤT TRONG AUTH CONTEXT
  // START PRESENCE.
  //
  // login()
  // initializeAuth()
  // KHÔNG tự gọi setSocketUser().
  //
  // Khi user thay đổi:
  //
  // null
  //   ↓
  // user A
  //   ↓
  // setSocketUser(A)
  //
  // user A
  //   ↓
  // user B
  //   ↓
  // setSocketUser(B)
  //
  // ===================================================

  useEffect(() => {
    const userId = user?._id ? String(user._id) : null;

    if (!userId) {
      return;
    }

    if (presenceUserRef.current === userId) {
      console.log("ℹ️ PRESENCE ALREADY STARTED:", userId);

      return;
    }

    if (presenceUserRef.current && presenceUserRef.current !== userId) {
      console.log(
        "🔄 CHANGE PRESENCE USER:",
        presenceUserRef.current,
        "→",
        userId,
      );

      leavePresence();
    }

    presenceUserRef.current = userId;

    console.log("🟢 AUTH START PRESENCE:", userId);

    setSocketUser(userId);
  }, [user?._id]);

  // ===================================================
  // APP LIFECYCLE
  // ===================================================

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      /*
       * KHÔNG:
       *
       * leavePresence()
       * disconnectSocket()
       *
       * ở đây.
       *
       * React StrictMode trong development có thể:
       *
       * mount
       * unmount
       * mount lại
       *
       * Nếu disconnect ở cleanup,
       * socket sẽ bị đóng ngoài ý muốn.
       */
    };
  }, []);

  // ===================================================
  // CONTEXT VALUE
  // ===================================================

  const contextValue = {
    // User
    user,
    setUser,

    // User update
    updateUser,

    // Permission
    permissions,
    hasPermission,

    // Loading
    loading,

    // Auth actions
    login,
    logout,

    // Auth state
    isAuthenticated: Boolean(user),
  };

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

// =====================================================
// USE AUTH
// =====================================================

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};
