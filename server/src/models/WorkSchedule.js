const mongoose = require("mongoose");

const workScheduleSchema = new mongoose.Schema(
  {
    imageUrl: {
      type: String,
      required: true,
    },

    publicId: {
      type: String,
      required: true,
    },

    sortOrder: {
      type: Number,
      default: 0,
    },

    category: {
      type: String,
      enum: ["schedule", "slide"],
      default: "schedule",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("WorkSchedule", workScheduleSchema);
