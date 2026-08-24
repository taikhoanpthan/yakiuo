const mongoose = require("mongoose");

const commissionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["wine", "abalone"],
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },

    tableNumber: {
      type: String,
      required: true,
      trim: true,
    },

    shift: {
      type: String,
      enum: ["morning", "afternoon", "evening"],
      required: true,
    },

    // =========================
    // WINE
    // =========================

    wineLevel: {
      type: String,
      enum: ["1m", "3m", null],
      default: null,
    },

    wineQty: {
      type: Number,
      default: 0,
      min: 0,
    },

    // =========================
    // ABALONE
    // =========================

    abaloneQty: {
      type: Number,
      default: 0,
      min: 0,
    },

    // =========================
    // COMMISSION
    // =========================

    commission: {
      type: Number,
      required: true,
      min: 0,
    },

    // Người tạo commission
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
  "Commission",
  commissionSchema
);