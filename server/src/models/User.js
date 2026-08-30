const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    avatar: {
      type: String,
      default: "",
    },

    coverImage: {
      type: String,
      default: "",
    },

    avatarPosition: {
      x: { type: Number, default: 50, min: 0, max: 100 },
      y: { type: Number, default: 50, min: 0, max: 100 },
    },

    avatarZoom: {
      type: Number,
      default: 1,
      min: 1,
      max: 2.5,
    },

    coverPosition: {
      x: { type: Number, default: 50, min: 0, max: 100 },
      y: { type: Number, default: 50, min: 0, max: 100 },
    },

    coverZoom: {
      type: Number,
      default: 1,
      min: 1,
      max: 2.5,
    },

    phone: {
      type: String,
      default: "",
    },

    // Biệt danh CFS được thiết lập một lần khi người dùng lần đầu vào CFS.
    // Không public ở API user thông thường; chỉ dùng để tạo bài viết ẩn danh.
    cfsAnonymousAlias: {
      type: String,
      default: "",
      trim: true,
      maxlength: 40,
    },

    role: {
      type: String,
      enum: ["employee", "premium", "manager", "admin"],
      default: "employee",
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    refreshTokenHash: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("User", userSchema);
