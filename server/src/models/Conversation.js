const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["direct", "group"],
      default: "direct",
      index: true,
    },

    name: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Danh sách user tham gia cuộc trò chuyện
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    // Người dùng đã xóa/ẩn đoạn chat khỏi hộp thư của riêng họ.
    deletedFor: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        deletedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Mốc xóa lịch sử riêng của từng người dùng. Tin trước mốc này không tải lại.
    clearedFor: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        clearedAt: {
          type: Date,
          required: true,
        },
      },
    ],

    // Tin nhắn cuối cùng
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    // Thời gian tin nhắn cuối
    lastMessageAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Tìm conversation 1-1 giữa 2 user nhanh hơn
conversationSchema.index({
  participants: 1,
});

module.exports = mongoose.model(
  "Conversation",
  conversationSchema,
);
