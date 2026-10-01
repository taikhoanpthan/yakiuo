const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      default: "",
      trim: true,
    },

    customerPhone: {
      type: String,
      default: "",
      trim: true,
    },

    tableNumber: {
      type: String,
      default: "",
      trim: true,
    },

    meal: {
      type: String,
      default: "",
      trim: true,
    },

    tags: {
      type: [String],
      default: [],
    },

    content: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },

    dateTime: {
      type: Date,
      default: Date.now,
    },

    // Thông tin kiểm toán: không trả về trong danh sách feedback thông thường.
    // Chỉ endpoint quản trị mới chủ động chọn các trường này.
    isLateEntry: {
      type: Boolean,
      default: false,
      select: false,
    },

    lateEntryFlaggedAt: {
      type: Date,
      default: null,
      select: false,
    },

    lateEntryDays: {
      type: Number,
      default: 0,
      min: 0,
      select: false,
    },

    // Admin đã xác nhận nhân viên có lý do nhập trễ. Vẫn giữ cờ gốc để lưu
    // lịch sử kiểm toán, nhưng không hiện lại trong danh sách cần rà soát.
    lateEntryResolvedAt: {
      type: Date,
      default: null,
      select: false,
    },

    lateEntryResolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      select: false,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

feedbackSchema.index({ isLateEntry: 1, lateEntryResolvedAt: 1, lateEntryFlaggedAt: -1 });

module.exports = mongoose.model(
  "Feedback",
  feedbackSchema
);
