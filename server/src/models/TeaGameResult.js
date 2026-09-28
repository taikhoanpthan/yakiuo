const mongoose = require("mongoose");

const teaGameResultSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  score: { type: Number, required: true, min: 0, max: 1020 },
  served: { type: Number, required: true, min: 1, max: 15 },
  mistakes: { type: Number, required: true, min: 0, max: 3 },
  bestCombo: { type: Number, required: true, min: 0, max: 15 },
  badge: { type: String, default: "" },
  weekStart: { type: Date, required: true, index: true },
}, { timestamps: true });

teaGameResultSchema.index({ weekStart: 1, score: -1, bestCombo: -1, createdAt: 1 });

module.exports = mongoose.model("TeaGameResult", teaGameResultSchema);
