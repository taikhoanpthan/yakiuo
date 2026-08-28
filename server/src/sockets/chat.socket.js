const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");

// =====================================================
// ONLINE USERS
//
// userId -> Set(socketId)
//
// Ví dụ:
//
// user A -> socket1, socket2
// user B -> socket3
//
// => ONLINE USER = 2
// => ONLINE SOCKET = 3
// =====================================================

const onlineUsers = new Map();

// =====================================================
// NORMALIZE ID
// =====================================================

const normalizeId = (value) => {
  if (!value) {
    return null;
  }

  return String(value);
};

// =====================================================
// GET ONLINE USER IDS
// =====================================================

const getOnlineUserIds = () => {
  return Array.from(onlineUsers.keys());
};

// =====================================================
// GET ONLINE USER COUNT
// =====================================================

const getOnlineUserCount = () => {
  return onlineUsers.size;
};

// =====================================================
// GET TOTAL SOCKET COUNT
// =====================================================

const getOnlineSocketCount = () => {
  let count = 0;

  for (const sockets of onlineUsers.values()) {
    count += sockets.size;
  }

  return count;
};

// =====================================================
// DEBUG ONLINE MAP
// =====================================================

const debugOnlineMap = () => {
  const map = Array.from(onlineUsers.entries()).map(
    ([userId, sockets]) => ({
      userId,
      socketCount: sockets.size,
      sockets: Array.from(sockets),
    })
  );

  console.log("=================================");
  console.log("🗺️ CURRENT ONLINE MAP");
  console.log(JSON.stringify(map, null, 2));
  console.log("👥 ONLINE USERS:", onlineUsers.size);
  console.log("🔌 ONLINE SOCKETS:", getOnlineSocketCount());
  console.log("=================================");
};

// =====================================================
// ADD ONLINE SOCKET
// =====================================================

const addOnlineSocket = (userId, socketId) => {
  const id = normalizeId(userId);

  if (!id || !socketId) {
    return {
      becameOnline: false,
      socketCount: 0,
    };
  }

  let sockets = onlineUsers.get(id);

  // User chưa online
  if (!sockets) {
    sockets = new Set();

    onlineUsers.set(id, sockets);
  }

  const wasOffline = sockets.size === 0;

  sockets.add(socketId);

  return {
    becameOnline: wasOffline,
    socketCount: sockets.size,
  };
};

// =====================================================
// REMOVE ONLINE SOCKET
// =====================================================

const removeOnlineSocket = (userId, socketId) => {
  const id = normalizeId(userId);

  if (!id || !socketId) {
    return {
      becameOffline: false,
      socketCount: 0,
      removed: false,
    };
  }

  const sockets = onlineUsers.get(id);

  if (!sockets) {
    return {
      becameOffline: false,
      socketCount: 0,
      removed: false,
    };
  }

  // Socket không tồn tại trong Set
  if (!sockets.has(socketId)) {
    return {
      becameOffline: false,
      socketCount: sockets.size,
      removed: false,
    };
  }

  sockets.delete(socketId);

  // User không còn socket nào
  if (sockets.size === 0) {
    onlineUsers.delete(id);

    return {
      becameOffline: true,
      socketCount: 0,
      removed: true,
    };
  }

  return {
    becameOffline: false,
    socketCount: sockets.size,
    removed: true,
  };
};

// =====================================================
// BUILD PRESENCE PAYLOAD
// =====================================================

const getPresencePayload = () => {
  const userIds = getOnlineUserIds();

  return {
    userIds,
    count: userIds.length,
  };
};

// =====================================================
// BROADCAST ONLINE STATE
// =====================================================

const broadcastOnlineState = (io) => {
  const payload = getPresencePayload();

  console.log("=================================");
  console.log("📡 PRESENCE SYNC");
  console.log("👥 ONLINE USERS:", payload.userIds);
  console.log("👥 ONLINE COUNT:", payload.count);
  console.log("🔌 TOTAL SOCKETS:", getOnlineSocketCount());
  console.log("=================================");

  io.emit("users:online", payload);

  io.emit("online:count", {
    count: payload.count,
  });
};

// =====================================================
// SEND CURRENT PRESENCE TO SOCKET
// =====================================================

const sendCurrentPresence = (socket) => {
  const payload = getPresencePayload();

  console.log(
    "📤 SEND CURRENT PRESENCE:",
    socket.id,
    payload
  );

  socket.emit("users:online", payload);

  socket.emit("online:count", {
    count: payload.count,
  });
};

// =====================================================
// REMOVE SOCKET PRESENCE
// =====================================================

const removeSocketPresence = (io, socket, reason = "unknown") => {
  const userId = normalizeId(socket.userId);
  const socketId = socket.id;

  // Socket chưa join user
  if (!userId) {
    console.log(
      "⚪ REMOVE PRESENCE SKIPPED:",
      socketId,
      "→ socket chưa có user"
    );

    return false;
  }

  console.log("=================================");
  console.log("🔴 REMOVE PRESENCE");
  console.log("👤 USER:", userId);
  console.log("🔌 SOCKET:", socketId);
  console.log("📌 REASON:", reason);

  const result = removeOnlineSocket(
    userId,
    socketId
  );

  console.log("🗑️ REMOVED:", result.removed);
  console.log(
    "🔌 REMAINING USER SOCKETS:",
    result.socketCount
  );

  // Rất quan trọng:
  // Socket này không còn thuộc user nữa
  socket.userId = null;

  // User thật sự offline
  if (result.becameOffline) {
    console.log(
      "🔴 USER REALLY OFFLINE:",
      userId
    );

    io.emit("user:offline", {
      userId,
      lastSeen: new Date(),
    });
  } else {
    console.log(
      "🟡 USER STILL ONLINE:",
      userId
    );
  }

  // Sync toàn bộ client
  broadcastOnlineState(io);

  // Debug Map
  debugOnlineMap();

  console.log("=================================");

  return true;
};

// =====================================================
// SOCKET SERVER
// =====================================================

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("=================================");
    console.log("🟢 SOCKET CONNECTED");
    console.log("🔌 SOCKET:", socket.id);
    console.log("👤 USER:", socket.userId || null);
    console.log("👥 ONLINE USERS:", getOnlineUserCount());
    console.log(
      "🔌 ONLINE SOCKETS:",
      getOnlineSocketCount()
    );
    console.log("=================================");

    // =================================================
    // SEND CURRENT PRESENCE
    // =================================================

    sendCurrentPresence(socket);

    // =================================================
    // USER JOIN
    // =================================================

    socket.on("user:join", async (data = {}) => {
      try {
        const requestedUserId = normalizeId(data.userId);
        const authenticatedUserId = normalizeId(socket.data.authUserId);

        console.log("=================================");
        console.log("📥 USER JOIN REQUEST");
        console.log("🔌 SOCKET:", socket.id);
        console.log("👤 USER:", requestedUserId);
        console.log("👤 CURRENT SOCKET USER:", socket.userId);
        console.log("=================================");

        // -------------------------------------------------
        // Validate ID
        // -------------------------------------------------

        if (!authenticatedUserId || requestedUserId !== authenticatedUserId) {
          socket.emit("presence:error", {
            message: "Không thể xác thực người dùng socket",
          });

          return;
        }

        // -------------------------------------------------
        // Socket đã join đúng user
        // -------------------------------------------------

        if (socket.userId === authenticatedUserId) {
          console.log(
            "ℹ️ SOCKET ALREADY JOINED:",
            requestedUserId,
            socket.id
          );

          sendCurrentPresence(socket);

          return;
        }

        // -------------------------------------------------
        // Socket đang thuộc user khác
        // -------------------------------------------------

        if (socket.userId) {
          console.log(
            "🔄 SOCKET CHANGE USER:",
            socket.userId,
            "→",
            requestedUserId
          );

          removeSocketPresence(
            io,
            socket,
            "change-user"
          );
        }

        // -------------------------------------------------
        // Validate user DB
        // -------------------------------------------------

        const user = await User.findById(
          requestedUserId
        ).select(
          "_id username role status"
        );

        if (!user) {
          console.log(
            "❌ USER NOT FOUND:",
            requestedUserId
          );

          socket.emit("presence:error", {
            message: "User không tồn tại",
          });

          return;
        }

        // -------------------------------------------------
        // Validate status
        // -------------------------------------------------

        if (user.status !== "active") {
          console.log(
            "❌ USER NOT ACTIVE:",
            requestedUserId,
            user.status
          );

          socket.emit("presence:error", {
            message: "Tài khoản đang bị khóa",
          });

          return;
        }

        // -------------------------------------------------
        // Gán user vào socket
        // -------------------------------------------------

        socket.userId = authenticatedUserId;

        // -------------------------------------------------
        // Add socket
        // -------------------------------------------------

        const result = addOnlineSocket(
          authenticatedUserId,
          socket.id
        );

        console.log("=================================");
        console.log("🟢 USER JOINED PRESENCE");
        console.log("👤 USER:", requestedUserId);
        console.log("👤 USERNAME:", user.username);
        console.log("🔌 SOCKET:", socket.id);
        console.log(
          "🟢 BECAME ONLINE:",
          result.becameOnline
        );
        console.log(
          "🔌 USER SOCKET COUNT:",
          result.socketCount
        );
        console.log(
          "👥 TOTAL ONLINE USERS:",
          getOnlineUserCount()
        );
        console.log(
          "🔌 TOTAL SOCKETS:",
          getOnlineSocketCount()
        );
        console.log("=================================");

        // -------------------------------------------------
        // User vừa online
        // -------------------------------------------------

        if (result.becameOnline) {
          io.emit("user:online", {
            userId: authenticatedUserId,
          });
        }

        // -------------------------------------------------
        // Sync toàn bộ client
        // -------------------------------------------------

        broadcastOnlineState(io);

        // -------------------------------------------------
        // Debug
        // -------------------------------------------------

        debugOnlineMap();
      } catch (error) {
        console.error(
          "❌ USER JOIN ERROR:",
          error
        );

        socket.emit("presence:error", {
          message:
            "Không thể xác định trạng thái online",
        });
      }
    });

    // =================================================
    // USER LEAVE
    // =================================================

    socket.on("user:leave", () => {
      console.log("=================================");
      console.log("📤 USER LEAVE");
      console.log("👤 USER:", socket.userId);
      console.log("🔌 SOCKET:", socket.id);
      console.log("=================================");

      try {
        removeSocketPresence(
          io,
          socket,
          "user-leave"
        );
      } catch (error) {
        console.error(
          "❌ USER LEAVE ERROR:",
          error
        );
      }
    });

    // =================================================
    // CONVERSATION JOIN
    // =================================================

    socket.on(
      "conversation:join",
      async (data = {}) => {
        try {
          const conversationId =
            data.conversationId;

          if (!conversationId) {
            socket.emit("chat:error", {
              message:
                "Conversation ID không hợp lệ",
            });

            return;
          }

          if (!socket.userId) {
            socket.emit("chat:error", {
              message:
                "Bạn chưa kết nối tài khoản",
            });

            return;
          }

          const conversation =
            await Conversation.findById(
              conversationId
            );

          if (!conversation) {
            socket.emit("chat:error", {
              message:
                "Conversation không tồn tại",
            });

            return;
          }

          const isParticipant =
            conversation.participants.some(
              (id) =>
                String(id) ===
                String(socket.userId)
            );

          if (!isParticipant) {
            socket.emit("chat:error", {
              message:
                "Bạn không thuộc conversation này",
            });

            return;
          }

          const roomName =
            `conversation:${conversationId}`;

          socket.join(roomName);

          console.log(
            `👥 ${socket.userId} joined ${roomName}`
          );

          socket.emit(
            "conversation:joined",
            {
              conversationId:
                String(conversationId),
            }
          );
        } catch (error) {
          console.error(
            "❌ CONVERSATION JOIN ERROR:",
            error
          );

          socket.emit("chat:error", {
            message:
              "Không thể tham gia conversation",
          });
        }
      }
    );

    // =================================================
    // CONVERSATION LEAVE
    // =================================================

    socket.on(
      "conversation:leave",
      (data = {}) => {
        const conversationId =
          data.conversationId;

        if (!conversationId) {
          return;
        }

        const roomName =
          `conversation:${conversationId}`;

        socket.leave(roomName);

        console.log(
          `👋 ${socket.id} left ${roomName}`
        );
      }
    );

    // =================================================
    // SEND MESSAGE
    // =================================================

    socket.on(
      "message:send",
      async (data = {}) => {
        const {
          conversationId,
          content,
          clientMessageId,
        } = data;

        try {
          // -------------------------------------------------
          // Check socket user
          // -------------------------------------------------

          if (!socket.userId) {
            socket.emit("message:error", {
              clientMessageId,
              message:
                "Socket chưa xác định user",
            });

            return;
          }

          // -------------------------------------------------
          // Validate
          // -------------------------------------------------

          if (
            !conversationId ||
            !content?.trim()
          ) {
            socket.emit("message:error", {
              clientMessageId,
              message:
                "Thiếu thông tin tin nhắn",
            });

            return;
          }

          const senderId =
            String(socket.userId);

          // -------------------------------------------------
          // Conversation
          // -------------------------------------------------

          const conversation =
            await Conversation.findById(
              conversationId
            );

          if (!conversation) {
            socket.emit("message:error", {
              clientMessageId,
              message:
                "Conversation không tồn tại",
            });

            return;
          }

          // -------------------------------------------------
          // Check participant
          // -------------------------------------------------

          const isParticipant =
            conversation.participants.some(
              (id) =>
                String(id) ===
                senderId
            );

          if (!isParticipant) {
            socket.emit("message:error", {
              clientMessageId,
              message:
                "Bạn không thuộc conversation này",
            });

            return;
          }

          // -------------------------------------------------
          // Create message
          // -------------------------------------------------

          const newMessage =
            await Message.create({
              conversationId,
              senderId,
              type: "text",
              content: content.trim(),
              seenBy: [senderId],
            });

          // -------------------------------------------------
          // Update conversation
          // -------------------------------------------------

          conversation.lastMessage =
            newMessage._id;

          conversation.lastMessageAt =
            newMessage.createdAt;

          // Tin nhắn mới sẽ đưa đoạn chat trở lại inbox của các bên.
          conversation.deletedFor = [];

          await conversation.save();

          // -------------------------------------------------
          // Populate
          // -------------------------------------------------

          const populatedMessage =
            await Message.findById(
              newMessage._id
            ).populate(
              "senderId",
              "_id username email avatar fullName"
            );

          // -------------------------------------------------
          // Room
          // -------------------------------------------------

          const roomName =
            `conversation:${conversationId}`;

          // -------------------------------------------------
          // Emit
          // -------------------------------------------------

          io.to(roomName).emit(
            "message:new",
            {
              ...populatedMessage.toObject(),

              clientMessageId,

              conversationId:
                String(conversationId),
            }
          );
        } catch (error) {
          console.error(
            "❌ SEND MESSAGE ERROR:",
            error
          );

          socket.emit("message:error", {
            clientMessageId,
            message:
              "Không thể gửi tin nhắn",
          });
        }
      }
    );

    // Người nhận đang mở cuộc trò chuyện: đồng bộ trạng thái đã xem cho mọi tab.
    socket.on("message:read", async (data = {}) => {
      try {
        const conversationId = data.conversationId;
        const readerId = String(socket.userId || "");

        if (!conversationId || !readerId) return;

        const conversation = await Conversation.findById(conversationId);
        const isParticipant = conversation?.participants.some(
          (id) => String(id) === readerId,
        );

        if (!isParticipant) return;

        const result = await Message.updateMany(
          {
            conversationId,
            senderId: { $ne: readerId },
            seenBy: { $ne: readerId },
            deletedAt: null,
          },
          { $addToSet: { seenBy: readerId } },
        );

        if (result.modifiedCount > 0) {
          io.to(`conversation:${conversationId}`).emit("message:read", {
            conversationId: String(conversationId),
            readerId,
            readAt: new Date(),
          });
        }
      } catch (error) {
        console.error("❌ MESSAGE READ ERROR:", error);
      }
    });

    // =================================================
    // DISCONNECT
    // =================================================

    socket.on("disconnect", (reason) => {
      console.log("=================================");
      console.log("🔴 SOCKET DISCONNECTED");
      console.log("🔌 SOCKET:", socket.id);
      console.log("👤 USER:", socket.userId);
      console.log("📌 REASON:", reason);
      console.log("=================================");

      try {
        removeSocketPresence(
          io,
          socket,
          `disconnect:${reason}`
        );
      } catch (error) {
        console.error(
          "❌ DISCONNECT PRESENCE ERROR:",
          error
        );
      }
    });
  });
};

// =====================================================
// EXPORT HELPERS
// =====================================================

module.exports.getOnlineUserCount =
  getOnlineUserCount;

module.exports.getOnlineUserIds =
  getOnlineUserIds;

module.exports.getOnlineSocketCount =
  getOnlineSocketCount;
