const mongoose = require("mongoose");

const cfsStorySchema = new mongoose.Schema(
  {
    content: { type: String, default: "", trim: true, maxlength: 300 },
    imageUrl: { type: String, default: "", trim: true, maxlength: 1000 },
    background: { type: String, default: "#334155", trim: true, maxlength: 40 },
    music: {
      provider: { type: String, enum: ["audius", "spotify", "youtube"], default: undefined },
      trackId: { type: String, trim: true, maxlength: 120 },
      title: { type: String, trim: true, maxlength: 200 },
      artist: { type: String, trim: true, maxlength: 160 },
      artworkUrl: { type: String, trim: true, maxlength: 1000 },
      duration: { type: Number, min: 0, max: 7200 },
      startAt: { type: Number, min: 0, max: 7200, default: 0 },
      embedUrl: { type: String, trim: true, maxlength: 1000 },
    },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

// MongoDB tự xóa Story sau khi thời hạn kết thúc.
cfsStorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
cfsStorySchema.index({ expiresAt: 1, createdAt: -1 });

module.exports = mongoose.model("CfsStory", cfsStorySchema);
