const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

// userId -> số socket đang kết nối
const onlineUsers = new Map();

const addOnlineUser = (userId) => {
  const id = String(userId);

  const count = onlineUsers.get(id) || 0;

  onlineUsers.set(id, count + 1);

  return count === 0;
};

const removeOnlineUser = (userId) => {
  const id = String(userId);

  const count = onlineUsers.get(id) || 0;

  if (count <= 1) {
    onlineUsers.delete(id);
    return true;
  }

  onlineUsers.set(id, count - 1);

  return false;
};

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("🟢 Socket connected:", socket.id);

    // =====================================================
    // AUTH USER
    // =====================================================

    socket.on("user:join", ({ userId }) => {
      if (!userId) {
        return;
      }

      socket.userId = String(userId);

      const becameOnline = addOnlineUser(userId);

      console.log(
        `👤 User ${userId} joined socket ${socket.id}`,
      );

      // Chỉ broadcast khi user thực sự chuyển
      // offline -> online
      if (becameOnline) {
        io.emit("user:online", {
          userId: String(userId),
        });
      }

      // Gửi danh sách người đang online cho chính user
      socket.emit("users:online", {
        userIds: Array.from(onlineUsers.keys()),
      });
    });

    // =====================================================
    // JOIN CONVERSATION
    // =====================================================

    socket.on(
      "conversation:join",
      async ({ conversationId }) => {
        try {
          if (!conversationId) {
            return;
          }

          const conversation =
            await Conversation.findById(
              conversationId,
            );

          if (!conversation) {
            socket.emit("chat:error", {
              message:
                "Conversation không tồn tại",
            });

            return;
          }

          const roomName =
            `conversation:${conversationId}`;

          socket.join(roomName);

          console.log(
            `👥 ${socket.id} joined ${roomName}`,
          );

          socket.emit(
            "conversation:joined",
            {
              conversationId,
            },
          );
        } catch (error) {
          console.error(
            "Join conversation error:",
            error,
          );

          socket.emit("chat:error", {
            message:
              "Không thể tham gia conversation",
          });
        }
      },
    );

    // =====================================================
    // LEAVE CONVERSATION
    // =====================================================

    socket.on(
      "conversation:leave",
      ({ conversationId }) => {
        if (!conversationId) {
          return;
        }

        const roomName =
          `conversation:${conversationId}`;

        socket.leave(roomName);
      },
    );

    // =====================================================
    // SEND MESSAGE
    // =====================================================

    socket.on(
      "message:send",
      async ({
        conversationId,
        senderId,
        content,
        clientMessageId,
      }) => {
        try {
          if (
            !conversationId ||
            !senderId ||
            !content?.trim()
          ) {
            socket.emit("message:error", {
              clientMessageId,
              message:
                "Thiếu thông tin tin nhắn",
            });

            return;
          }

          // -----------------------------------------------
          // Bảo vệ senderId
          // -----------------------------------------------

          if (
            socket.userId &&
            String(socket.userId) !==
              String(senderId)
          ) {
            socket.emit("message:error", {
              clientMessageId,
              message:
                "Không hợp lệ",
            });

            return;
          }

          const conversation =
            await Conversation.findById(
              conversationId,
            );

          if (!conversation) {
            socket.emit("message:error", {
              clientMessageId,
              message:
                "Conversation không tồn tại",
            });

            return;
          }

          const isParticipant =
            conversation.participants.some(
              (id) =>
                String(id) ===
                String(senderId),
            );

          if (!isParticipant) {
            socket.emit("message:error", {
              clientMessageId,
              message:
                "Bạn không thuộc conversation này",
            });

            return;
          }

          // -----------------------------------------------
          // CREATE MESSAGE
          // -----------------------------------------------

          const message =
            await Message.create({
              conversationId,
              senderId,
              type: "text",
              content: content.trim(),
              seenBy: [senderId],
            });

          // -----------------------------------------------
          // UPDATE CONVERSATION
          // -----------------------------------------------

          conversation.lastMessage =
            message._id;

          conversation.lastMessageAt =
            message.createdAt;

          await conversation.save();

          // -----------------------------------------------
          // POPULATE
          // -----------------------------------------------

          const populatedMessage =
            await Message.findById(
              message._id,
            ).populate(
              "senderId",
              "_id username email avatar",
            );

          // -----------------------------------------------
          // BROADCAST
          // -----------------------------------------------

          const roomName =
            `conversation:${conversationId}`;

          io.to(roomName).emit(
            "message:new",
            {
              ...populatedMessage.toObject(),
              clientMessageId,
            },
          );

          console.log(
            `💬 Message sent → ${roomName}`,
          );
        } catch (error) {
          console.error(
            "Send message error:",
            error,
          );

          socket.emit("message:error", {
            clientMessageId,
            message:
              "Không thể gửi tin nhắn",
          });
        }
      },
    );

    // =====================================================
    // DISCONNECT
    // =====================================================

    socket.on("disconnect", () => {
      const userId = socket.userId;

      if (!userId) {
        console.log(
          "🔴 Socket disconnected:",
          socket.id,
        );

        return;
      }

      const becameOffline =
        removeOnlineUser(userId);

      console.log(
        `🔴 User ${userId} disconnected`,
      );

      // Chỉ báo offline khi tất cả socket của user
      // đều đã disconnect
      if (becameOffline) {
        io.emit("user:offline", {
          userId: String(userId),
          lastSeen: new Date(),
        });
      }
    });
  });
};