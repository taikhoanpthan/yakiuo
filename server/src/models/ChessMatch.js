const mongoose = require("mongoose");

module.exports = mongoose.model("ChessMatch", new mongoose.Schema({
  playerWhite: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  playerBlack: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  winner: { type: String, enum: ["w", "b", "draw"], required: true },
  moveCount: { type: Number, required: true, min: 1 },
  moves: [{ from: { row: Number, col: Number }, to: { row: Number, col: Number }, piece: String }],
}, { timestamps: true }));
