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

module.exports = mongoose.model(
  "Feedback",
  feedbackSchema
);