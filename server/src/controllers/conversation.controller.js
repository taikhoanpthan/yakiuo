const Conversation = require("../models/Conversation");
const User = require("../models/User");

// =========================
// CREATE / GET 1-1 CONVERSATION
// =========================

const createConversation = async (req, res) => {
  try {
    // authenticate middleware đã gắn user vào req.user
    const currentUserId = req.user._id;

    const { userId } = req.body;

    // =========================
    // VALIDATE
    // =========================

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId là bắt buộc",
      });
    }

    // Không chat với chính mình
    if (currentUserId.toString() === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: "Không thể tạo conversation với chính mình",
      });
    }

    // =========================
    // FIND TARGET USER
    // =========================

    const targetUser = await User.findById(userId).select(
      "_id username email avatar phone role status",
    );

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    // Không cho chat với account inactive
    if (targetUser.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Tài khoản người dùng đang bị khóa",
      });
    }

    // =========================
    // FIND EXISTING CONVERSATION
    // =========================

    let conversation = await Conversation.findOne({
      participants: {
        $all: [currentUserId, userId],
      },
    }).populate(
      "participants",
      "_id username email avatar phone role status",
    );

    // =========================
    // CREATE IF NOT EXISTS
    // =========================

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [
          currentUserId,
          userId,
        ],
      });

      conversation = await Conversation.findById(
        conversation._id,
      ).populate(
        "participants",
        "_id username email avatar phone role status",
      );
    }

    return res.status(200).json({
      success: true,
      message: "Conversation ready",
      data: conversation,
    });
  } catch (error) {
    console.error(
      "Create conversation error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Không thể tạo conversation",
    });
  }
};

// =========================
// GET MY CONVERSATIONS
// =========================

const getMyConversations = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const conversations =
      await Conversation.find({
        participants: currentUserId,
      })
        .populate(
          "participants",
          "_id username email avatar phone role status",
        )
        .populate(
          "lastMessage",
          "_id senderId content type createdAt",
        )
        .sort({
          lastMessageAt: -1,
          updatedAt: -1,
        });

    return res.json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    console.error(
      "Get conversations error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Không thể lấy conversations",
    });
  }
};

// =========================
// GET ONE CONVERSATION
// =========================

const getConversationById = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { id } = req.params;

    const conversation =
      await Conversation.findById(id)
        .populate(
          "participants",
          "_id username email avatar phone role status",
        )
        .populate(
          "lastMessage",
          "_id senderId content type createdAt",
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
        (user) =>
          user._id.toString() ===
          currentUserId.toString(),
      );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message:
          "Bạn không thuộc conversation này",
      });
    }

    return res.json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    console.error(
      "Get conversation error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Không thể lấy conversation",
    });
  }
};

module.exports = {
  createConversation,
  getMyConversations,
  getConversationById,
};