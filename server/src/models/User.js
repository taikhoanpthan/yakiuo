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

    phone: {
      type: String,
      default: "",
    },

    role: {
      type: String,
      enum: ["employee", "manager", "admin"],
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
