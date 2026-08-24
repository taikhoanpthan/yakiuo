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

    const [messages, total] =
      await Promise.all([
        Message.find({
          conversationId,
        })
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

        Message.countDocuments({
          conversationId,
        }),
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

module.exports = {
  getMessages,
};