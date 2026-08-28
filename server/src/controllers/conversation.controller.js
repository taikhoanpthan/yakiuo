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
        type: "direct",
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
    } else {
      // Chủ động mở lại chat đã xóa thì đưa nó trở lại hộp thư của người này.
      conversation.deletedFor = conversation.deletedFor.filter(
        (entry) => String(entry.userId) !== String(currentUserId),
      );
      await conversation.save();
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
        "deletedFor.userId": { $ne: currentUserId },
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
// DELETE CONVERSATION FOR CURRENT USER
// =========================

const deleteConversation = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation || !conversation.participants.some((id) => String(id) === String(currentUserId))) {
      return res.status(404).json({ success: false, message: "Conversation không tồn tại" });
    }

    const deletedAt = new Date();

    conversation.deletedFor = conversation.deletedFor.filter(
      (entry) => String(entry.userId) !== String(currentUserId),
    );
    conversation.deletedFor.push({ userId: currentUserId, deletedAt });

    conversation.clearedFor = conversation.clearedFor.filter(
      (entry) => String(entry.userId) !== String(currentUserId),
    );
    conversation.clearedFor.push({ userId: currentUserId, clearedAt: deletedAt });
    await conversation.save();

    return res.json({ success: true, message: "Đã xóa cuộc trò chuyện khỏi hộp thư của bạn" });
  } catch (error) {
    console.error("Delete conversation error:", error);
    return res.status(500).json({ success: false, message: "Không thể xóa cuộc trò chuyện" });
  }
};

const createGroupConversation = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { name, participantIds } = req.body;

    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Chỉ admin được tạo nhóm chat" });
    }

    const groupName = String(name || "").trim();
    const uniqueIds = [...new Set((Array.isArray(participantIds) ? participantIds : []).map(String))]
      .filter((id) => id !== String(currentUserId));

    if (!groupName) {
      return res.status(400).json({ success: false, message: "Vui lòng nhập tên nhóm" });
    }
    if (!uniqueIds.length) {
      return res.status(400).json({ success: false, message: "Vui lòng chọn ít nhất một thành viên" });
    }

    const users = await User.find({ _id: { $in: uniqueIds }, status: "active" }).select("_id");
    if (users.length !== uniqueIds.length) {
      return res.status(400).json({ success: false, message: "Một hoặc nhiều thành viên không hợp lệ" });
    }

    const conversation = await Conversation.create({
      type: "group",
      name: groupName,
      createdBy: currentUserId,
      participants: [currentUserId, ...uniqueIds],
    });
    const populatedConversation = await Conversation.findById(conversation._id).populate(
      "participants",
      "_id username email avatar phone role status fullName",
    );

    const io = req.app.get("io");
    populatedConversation.participants.forEach((participant) => {
      io?.to(`user:${participant._id}`).emit("conversation:created", populatedConversation);
    });

    return res.status(201).json({ success: true, message: "Tạo nhóm chat thành công", data: populatedConversation });
  } catch (error) {
    console.error("Create group conversation error:", error);
    return res.status(500).json({ success: false, message: "Không thể tạo nhóm chat" });
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
  createGroupConversation,
  getMyConversations,
  getConversationById,
  deleteConversation,
};
