const mongoose = require("mongoose");

const cfsReplySchema = new mongoose.Schema(
  {
    content: { type: String, required: true, trim: true, maxlength: 1000 },
    isAnonymous: { type: Boolean, default: false },
    anonymousAlias: { type: String, default: "", trim: true, maxlength: 40 },
    imageUrl: { type: String, default: "", trim: true, maxlength: 1000 },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // null là phản hồi cho status; có giá trị là phản hồi cho một bình luận khác.
    parentReplyId: { type: mongoose.Schema.Types.ObjectId, default: null },
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true },
);

const cfsPostSchema = new mongoose.Schema(
  {
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    isAnonymous: { type: Boolean, default: false },
    anonymousAlias: { type: String, default: "", trim: true, maxlength: 40 },
    imageUrl: { type: String, default: "", trim: true, maxlength: 1000 },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    replies: { type: [cfsReplySchema], default: [] },
  },
  { timestamps: true },
);

cfsPostSchema.index({ createdAt: -1 });

module.exports = mongoose.model("CfsPost", cfsPostSchema);
