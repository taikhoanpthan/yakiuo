const mongoose = require("mongoose");

const caroMatchSchema = new mongoose.Schema(
  {
    playerX: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    playerO: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    winner: { type: String, enum: ["X", "O", "draw"], required: true },
    moveCount: { type: Number, required: true, min: 1 },
    moves: [{
      row: { type: Number, required: true, min: 0, max: 14 },
      col: { type: Number, required: true, min: 0, max: 14 },
      mark: { type: String, enum: ["X", "O"], required: true },
    }],
    endReason: { type: String, enum: ["win", "draw", "timeout"], default: "win" },
  },
  { timestamps: true },
);

caroMatchSchema.index({ createdAt: -1 });

module.exports = mongoose.model("CaroMatch", caroMatchSchema);
