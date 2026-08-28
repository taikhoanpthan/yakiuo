const mongoose = require("mongoose");

const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

// =========================
// GET MESSAGES
// =========================

const getMessages = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { conversationId } = req.params;

    // =========================
    // VALIDATE ID
    // =========================

    if (
      !mongoose.Types.ObjectId.isValid(
        conversationId,
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Conversation ID không hợp lệ",
      });
    }

    // =========================
    // FIND CONVERSATION
    // =========================

    const conversation =
      await Conversation.findById(
        conversationId,
      );

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation không tồn tại",
      });
    }

    // =========================
    // CHECK PARTICIPANT
    // =========================

    const isParticipant =
      conversation.participants.some(
        (id) =>
          id.toString() ===
          currentUserId.toString(),
      );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message:
          "Bạn không thuộc conversation này",
      });
    }

    // =========================
    // PAGINATION
    // =========================

    const page = Math.max(
      Number(req.query.page) || 1,
      1,
    );

    const limit = Math.min(
      Math.max(
        Number(req.query.limit) || 30,
        1,
      ),
      100,
    );

    const skip = (page - 1) * limit;

    // =========================
    // GET MESSAGES
    // =========================

    const clearEntry = conversation.clearedFor?.find(
      (entry) => String(entry.userId) === String(currentUserId),
    );

    const messageFilter = {
      conversationId,
      deletedAt: null,
      ...(clearEntry?.clearedAt
        ? { createdAt: { $gt: clearEntry.clearedAt } }
        : {}),
    };

    const [messages, total] =
      await Promise.all([
        Message.find(messageFilter)
          .populate(
            "senderId",
            "_id username email avatar",
          )
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean(),

        Message.countDocuments(messageFilter),
      ]);

    // Đảo lại để frontend nhận
    // từ cũ → mới
    messages.reverse();

    return res.json({
      success: true,

      data: messages,

      pagination: {
        page,
        limit,
        total,

        totalPages:
          Math.ceil(total / limit),

        hasMore:
          page * limit < total,
      },
    });
  } catch (error) {
    console.error(
      "Get messages error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Không thể lấy lịch sử tin nhắn",
    });
  }
};

// =========================
// MARK CONVERSATION AS READ
// =========================

const markMessagesAsRead = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { conversationId } = req.params;
    const conversation = await Conversation.findById(conversationId);

    if (!conversation || !conversation.participants.some((id) => String(id) === String(currentUserId))) {
      return res.status(404).json({ success: false, message: "Conversation không tồn tại" });
    }

    const result = await Message.updateMany(
      { conversationId, senderId: { $ne: currentUserId }, seenBy: { $ne: currentUserId }, deletedAt: null },
      { $addToSet: { seenBy: currentUserId } },
    );

    if (result.modifiedCount > 0) {
      req.app.get("io")?.to(`conversation:${conversationId}`).emit("message:read", {
        conversationId: String(conversationId),
        readerId: String(currentUserId),
        readAt: new Date(),
      });
    }

    return res.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (error) {
    console.error("Mark messages as read error:", error);
    return res.status(500).json({ success: false, message: "Không thể cập nhật trạng thái đã xem" });
  }
};

// =========================
// DELETE OWN MESSAGE
// =========================

const deleteMessage = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { messageId } = req.params;
    const message = await Message.findOne({ _id: messageId, deletedAt: null });

    if (!message) {
      return res.status(404).json({ success: false, message: "Tin nhắn không tồn tại" });
    }

    if (String(message.senderId) !== String(currentUserId)) {
      return res.status(403).json({ success: false, message: "Bạn chỉ có thể xóa tin nhắn của mình" });
    }

    const deletedAt = new Date();
    await Message.deleteOne({ _id: message._id });

    const conversation = await Conversation.findById(message.conversationId);
    if (conversation && String(conversation.lastMessage || "") === String(message._id)) {
      const latest = await Message.findOne({ conversationId: message.conversationId, deletedAt: null }).sort({ createdAt: -1 });
      conversation.lastMessage = latest?._id || null;
      conversation.lastMessageAt = latest?.createdAt || null;
      await conversation.save();
    }

    req.app.get("io")?.to(`conversation:${message.conversationId}`).emit("message:deleted", {
      messageId: String(message._id),
      conversationId: String(message.conversationId),
      deletedAt,
    });

    return res.json({
      success: true,
      data: {
        messageId: String(message._id),
        conversationId: String(message.conversationId),
        deletedAt,
      },
    });
  } catch (error) {
    console.error("Delete message error:", error);
    return res.status(500).json({ success: false, message: "Không thể xóa tin nhắn" });
  }
};

module.exports = {
  getMessages,
  markMessagesAsRead,
  deleteMessage,
};
