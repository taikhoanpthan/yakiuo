const mongoose = require("mongoose");

const commissionGGImageSchema = new mongoose.Schema(
  {
    imageUrl: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      required: true,
    },
    monthKey: {
      type: String,
      required: true,
      match: /^\d{4}-(0[1-9]|1[0-2])$/,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

commissionGGImageSchema.index({ createdBy: 1, monthKey: 1, createdAt: -1 });

module.exports = mongoose.model("CommissionGGImage", commissionGGImageSchema);
