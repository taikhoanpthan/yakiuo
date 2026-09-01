const mongoose = require("mongoose");

// Thông báo CFS là dữ liệu riêng tư của từng người nhận, không dùng bảng
// thông báo chung của hệ thống.
const cfsNotificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    post: { type: mongoose.Schema.Types.ObjectId, ref: "CfsPost", required: true },
    replyId: { type: mongoose.Schema.Types.ObjectId, default: null },
    type: { type: String, enum: ["post_like", "post_reply", "reply", "reply_like"], required: true },
    isAnonymous: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

cfsNotificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model("CfsNotification", cfsNotificationSchema);
