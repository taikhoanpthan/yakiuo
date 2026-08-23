const mongoose = require("mongoose");

const todoSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: true,
      trim: true,
    },

    priority: {
      type: String,
      enum: ["low", "normal", "high"],
      default: "normal",
    },

    assignedShift: {
      type: String,
      enum: ["morning", "afternoon"],
      default: "afternoon",
    },

    dueDate: {
      type: Date,
      default: Date.now,
    },

    completed: {
      type: Boolean,
      default: false,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Todo", todoSchema);