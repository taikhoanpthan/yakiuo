import { io } from "socket.io-client";

const debugLog = (...args) => {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
};

// =====================================================
// SOCKET CONFIG
// =====================================================

const SOCKET_URL = (
  import.meta.env.VITE_SOCKET_URL || "http://localhost:4000"
).replace(/\/$/, "");

// =====================================================
// SINGLETON
// =====================================================

let socket = null;

// User mà client hiện tại muốn đăng nhập socket
let currentUserId = null;
let latestOnlineUsers = [];

// =====================================================
// CREATE SOCKET
// =====================================================

const createSocket = () => {
  // -----------------------------------------------
  // ĐÃ CÓ SOCKET
  // -----------------------------------------------

  if (socket) {
    return socket;
  }

  debugLog("🔌 CREATE SOCKET:", SOCKET_URL);

  socket = io(SOCKET_URL, {
    autoConnect: false,

    transports: ["websocket", "polling"],

    withCredentials: true,

    reconnection: true,

    reconnectionAttempts: Infinity,

    reconnectionDelay: 1000,

    reconnectionDelayMax: 5000,

    timeout: 10000,

    // Lấy token mới nhất mỗi lần Socket.IO (re)connect.
    auth: (callback) => callback({
      token: localStorage.getItem("accessToken"),
    }),
  });

  // =================================================
  // CONNECT
  // =================================================

  socket.on("connect", () => {
    debugLog("=================================");
    debugLog("🟢 SOCKET CONNECTED:", socket.id);
    debugLog("👤 CURRENT USER:", currentUserId);
    debugLog("=================================");

    // -----------------------------------------------
    // Socket reconnect
    // phải join lại presence
    // -----------------------------------------------

    if (currentUserId) {
      debugLog("📤 JOIN PRESENCE AFTER CONNECT:", currentUserId);

      socket.emit("user:join", {
        userId: currentUserId,
      });
    }
  });

  // =================================================
  // DISCONNECT
  // =================================================

  socket.on("disconnect", (reason) => {
    debugLog("=================================");
    debugLog("🔴 SOCKET DISCONNECTED");
    debugLog("🔌 Socket:", socket?.id);
    debugLog("👤 User:", currentUserId);
    debugLog("📌 Reason:", reason);
    debugLog("=================================");

  });

  // =================================================
  // CONNECT ERROR
  // =================================================

  socket.on("connect_error", (error) => {
    console.error("❌ SOCKET CONNECT ERROR:", error?.message || error);
  });

  // =================================================
  // PRESENCE ERROR
  // =================================================

  socket.on("presence:error", (data) => {
    console.error("❌ PRESENCE ERROR:", data);
  });

  // Server gửi sự kiện này khi quản trị viên khóa tài khoản.
  // Xóa token và quay về đăng nhập ngay, không chờ request tiếp theo.
  socket.on("account:locked", (data = {}) => {
    console.warn("🔒 ACCOUNT LOCKED:", data.message || "Tài khoản đã bị khóa");

    currentUserId = null;
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    localStorage.removeItem("currentUser");
    socket.disconnect();
    window.location.assign("/login");
  });

  return socket;
};

// =====================================================
// CONNECT SOCKET
// =====================================================

export const connectSocket = () => {
  const currentSocket = createSocket();

  if (!currentSocket.connected) {
    debugLog("🔌 CONNECT SOCKET");

    currentSocket.connect();
  }

  return currentSocket;
};

// =====================================================
// SET SOCKET USER
// =====================================================

export const setSocketUser = (userId) => {
  const id = userId ? String(userId) : null;

  // ============================================
  // CLEAR USER
  // ============================================

  if (!id) {
    debugLog("⚪ CLEAR SOCKET USER");

    currentUserId = null;

    return socket;
  }

  // ============================================
  // GET SINGLETON SOCKET
  // ============================================

  const currentSocket = createSocket();

  // ============================================
  // SAME USER
  // ============================================

  if (currentUserId === id) {
    debugLog("ℹ️ SOCKET USER ALREADY SET:", id);

    // Nếu socket chưa connect thì connect
    if (!currentSocket.connected) {
      debugLog("🔌 SOCKET NOT CONNECTED → CONNECT:", id);

      currentSocket.connect();
    }

    return currentSocket;
  }

  // ============================================
  // CHANGE USER
  // ============================================

  if (currentUserId && currentUserId !== id) {
    debugLog("🔄 CHANGE SOCKET USER:", currentUserId, "→", id);

    if (currentSocket.connected) {
      currentSocket.emit("user:leave");
    }
  }

  // ============================================
  // SET NEW USER
  // ============================================

  currentUserId = id;

  // ============================================
  // ALREADY CONNECTED
  // ============================================

  if (currentSocket.connected) {
    debugLog("📤 SOCKET ALREADY CONNECTED → JOIN:", id);

    currentSocket.emit("user:join", {
      userId: id,
    });

    return currentSocket;
  }

  // ============================================
  // CONNECT
  // ============================================

  debugLog("🔌 CONNECT SOCKET FOR USER:", id);

  currentSocket.connect();

  return currentSocket;
};

// =====================================================
// JOIN PRESENCE
// =====================================================

export const joinPresence = (userId) => {
  return setSocketUser(userId);
};

// =====================================================
// LEAVE PRESENCE
// =====================================================

export const leavePresence = () => {
  if (!socket) {
    currentUserId = null;

    return;
  }

  debugLog("📤 LEAVE PRESENCE:", currentUserId);

  if (socket.connected && currentUserId) {
    socket.emit("user:leave");
  }

  currentUserId = null;
};

// =====================================================
// GET SOCKET
// =====================================================

export const getSocket = () => {
  return socket;
};

// =====================================================
// GET CURRENT SOCKET USER
// =====================================================

export const getSocketUser = () => {
  return currentUserId;
};

// =====================================================
// ONLINE USERS
// =====================================================

export const onOnlineUsers = (callback) => {
  const currentSocket = createSocket();

  const handler = (data = {}) => {
    const userIds = Array.isArray(data.userIds) ? data.userIds.map(String) : [];
    latestOnlineUsers = userIds;

    const count = Number(data.count ?? userIds.length);

    debugLog("👥 SOCKET ONLINE USERS:", {
      userIds,
      count,
    });

    callback({
      userIds,
      count: Number.isFinite(count) ? count : userIds.length,
    });
  };

  currentSocket.on("users:online", handler);

  callback({
    userIds: latestOnlineUsers,
    count: latestOnlineUsers.length,
  });

  return () => {
    currentSocket.off("users:online", handler);
  };
};

// =====================================================
// ONLINE COUNT
// =====================================================

export const onOnlineCount = (callback) => {
  const currentSocket = createSocket();

  const handler = (data = {}) => {
    const count = Number(data.count ?? 0);

    callback(Number.isFinite(count) ? count : 0);
  };

  currentSocket.on("online:count", handler);

  return () => {
    currentSocket.off("online:count", handler);
  };
};

// =====================================================
// USER ONLINE
// =====================================================

export const onUserOnline = (callback) => {
  const currentSocket = createSocket();

  currentSocket.on("user:online", callback);

  return () => {
    currentSocket.off("user:online", callback);
  };
};

// =====================================================
// USER OFFLINE
// =====================================================

export const onUserOffline = (callback) => {
  const currentSocket = createSocket();

  currentSocket.on("user:offline", callback);

  return () => {
    currentSocket.off("user:offline", callback);
  };
};

// =====================================================
// DISCONNECT SOCKET
// =====================================================

export const disconnectSocket = () => {
  if (!socket) {
    currentUserId = null;

    return;
  }

  debugLog("🔌 DISCONNECT SOCKET:", socket.id);

  currentUserId = null;

  socket.disconnect();

  socket.removeAllListeners();

  socket = null;
};

// =====================================================
// DEFAULT
// =====================================================

export default {
  connectSocket,
  getSocket,
  getSocketUser,
  setSocketUser,
  joinPresence,
  leavePresence,
  disconnectSocket,
  onOnlineUsers,
  onOnlineCount,
  onUserOnline,
  onUserOffline,
};
