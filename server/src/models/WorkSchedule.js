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
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("WorkSchedule", workScheduleSchema);