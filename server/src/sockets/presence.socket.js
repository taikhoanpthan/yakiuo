const onlineUsers = new Map();

const getPresencePayload = (io) => {
  const userIds = Array.from(onlineUsers.keys());
  const users = userIds.map((userId) => {
    const socketId = onlineUsers.get(userId)?.values().next().value;
    return io.sockets.sockets.get(socketId)?.data?.authUserProfile || { _id: userId, fullName: "Người dùng Yakiuo", username: "", avatar: "" };
  });
  return { userIds, users, count: userIds.length };
};

const broadcastPresence = (io) => {
  const payload = getPresencePayload(io);
  io.emit("users:online", payload);
  io.emit("online:count", { count: payload.count });
};

const leavePresence = (io, socket) => {
  const userId = socket.data.presenceUserId;
  if (!userId) return;
  const sockets = onlineUsers.get(userId);
  sockets?.delete(socket.id);
  if (!sockets?.size) {
    onlineUsers.delete(userId);
    io.emit("user:offline", { userId, lastSeen: new Date() });
  }
  socket.data.presenceUserId = null;
  broadcastPresence(io);
};

module.exports = (io) => {
  io.on("connection", (socket) => {
    const userId = String(socket.data.authUserId || "");
    if (!userId) return socket.disconnect(true);

    socket.join(`user:${userId}`);
    socket.data.presenceUserId = userId;
    const wasOffline = !onlineUsers.has(userId);
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);
    if (wasOffline) io.emit("user:online", { userId });
    broadcastPresence(io);

    // Tương thích với client hiện tại; userId luôn được lấy từ token socket.
    socket.on("user:join", () => {
      socket.emit("users:online", getPresencePayload(io));
    });
    socket.on("user:leave", () => leavePresence(io, socket));
    socket.on("disconnect", () => leavePresence(io, socket));
  });
};

module.exports.getOnlineUserCount = () => onlineUsers.size;
module.exports.getOnlineUserIds = () => Array.from(onlineUsers.keys());
