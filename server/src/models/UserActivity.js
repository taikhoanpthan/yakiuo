const mongoose = require("mongoose");

const userActivitySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: ["login", "password_changed", "avatar_changed", "cover_changed"],
      required: true,
      index: true,
    },
    imageUrl: { type: String, default: "" },
    oldImageUrl: { type: String, default: "" },
    newImageUrl: { type: String, default: "" },
    ipAddress: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  { timestamps: true },
);

userActivitySchema.index({ createdAt: -1 });

module.exports = mongoose.model("UserActivity", userActivitySchema);
