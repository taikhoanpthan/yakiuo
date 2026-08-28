const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    // Conversation chứa message này
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },

    // Người gửi
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Loại message
    type: {
      type: String,
      enum: [
        "text",
        "image",
        "file",
        "system",
      ],
      default: "text",
    },

    // Nội dung text
    content: {
      type: String,
      default: "",
      trim: true,
    },

    // Những user đã xem message
    seenBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Xóa mềm để bảo toàn lịch sử/audit cuộc trò chuyện.
    deletedAt: {
      type: Date,
      default: null,
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Reply message
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Tìm message theo conversation
messageSchema.index({
  conversationId: 1,
  createdAt: -1,
});

module.exports = mongoose.model(
  "Message",
  messageSchema,
);
