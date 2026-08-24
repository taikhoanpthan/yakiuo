import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  "http://localhost:4000";

let socket = null;

// =====================================================
// CONNECT SOCKET
// =====================================================

export const connectSocket = () => {
  // Đã có socket và đang connected
  if (socket?.connected) {
    return socket;
  }

  // Socket đã được tạo nhưng đang reconnect
  if (socket) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    transports: ["websocket", "polling"],

    withCredentials: true,

    autoConnect: true,

    reconnection: true,

    reconnectionAttempts: Infinity,

    reconnectionDelay: 1000,

    reconnectionDelayMax: 5000,

    timeout: 10000,
  });

  // ===================================================
  // CONNECT
  // ===================================================

  socket.on("connect", () => {
    console.log(
      "🟢 Frontend socket connected:",
      socket.id,
    );
  });

  // ===================================================
  // DISCONNECT
  // ===================================================

  socket.on("disconnect", (reason) => {
    console.log(
      "🔴 Frontend socket disconnected:",
      reason,
    );
  });

  // ===================================================
  // CONNECT ERROR
  // ===================================================

  socket.on("connect_error", (error) => {
    console.error(
      "❌ Socket connection error:",
      error?.message || error,
    );
  });

  // ===================================================
  // RECONNECT ATTEMPT
  // ===================================================

  socket.io.on("reconnect_attempt", (attempt) => {
    console.log(
      "🔄 Socket reconnect attempt:",
      attempt,
    );
  });

  // ===================================================
  // RECONNECT
  // ===================================================

  socket.io.on("reconnect", (attempt) => {
    console.log(
      "🟢 Socket reconnected after attempt:",
      attempt,
    );
  });

  return socket;
};

// =====================================================
// GET SOCKET
// =====================================================

export const getSocket = () => {
  return socket;
};

// =====================================================
// DISCONNECT SOCKET
// =====================================================

export const disconnectSocket = () => {
  if (!socket) {
    return;
  }

  socket.removeAllListeners();

  socket.disconnect();

  socket = null;
};