const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    // Danh sách user tham gia cuộc trò chuyện
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
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