const CfsPost = require("../models/CfsPost");

const userFields = "fullName username avatar avatarPosition avatarZoom coverImage coverPosition coverZoom role";
const isAdmin = (user) => user?.role === "admin";
const sameId = (left, right) => String(left?._id || left) === String(right?._id || right);
const broadcastCfsChanged = (req) => req.app.get("io")?.emit("cfs:changed");

const presentAuthor = (author, anonymous, alias, viewer) => {
  if (anonymous && !isAdmin(viewer)) return { name: alias || "Ẩn danh", anonymous: true };
  return {
    name: anonymous ? (alias || "Ẩn danh") : (author?.fullName || author?.username || "Yakiuo member"),
    fullName: anonymous ? undefined : author?.fullName,
    username: anonymous ? undefined : author?.username,
    avatar: anonymous ? "" : author?.avatar || "",
    avatarPosition: anonymous ? undefined : author?.avatarPosition,
    avatarZoom: anonymous ? undefined : author?.avatarZoom,
    coverImage: anonymous ? "" : author?.coverImage || "",
    coverPosition: anonymous ? undefined : author?.coverPosition,
    coverZoom: anonymous ? undefined : author?.coverZoom,
    userId: anonymous ? undefined : author?._id,
    anonymous: Boolean(anonymous),
    identity: anonymous && isAdmin(viewer) ? author : undefined,
  };
};

const presentPost = (post, viewer) => ({
  _id: post._id,
  content: post.content,
  imageUrl: post.imageUrl || "",
  background: post.background || "",
  createdAt: post.createdAt,
  isAnonymous: post.isAnonymous,
  author: presentAuthor(post.author, post.isAnonymous, post.anonymousAlias, viewer),
  likes: post.likedBy?.length || 0,
  likeUsers: (post.likedBy || []).filter(Boolean).map((user) => ({ _id: user._id || user, name: user.fullName || user.username || "Yakiuo member", avatar: user.avatar || "", avatarPosition: user.avatarPosition, avatarZoom: user.avatarZoom, coverImage: user.coverImage || "", coverPosition: user.coverPosition, coverZoom: user.coverZoom })),
  liked: post.likedBy?.some((id) => sameId(id, viewer)) || false,
  isOwner: sameId(post.author, viewer),
  canManage: sameId(post.author, viewer) || isAdmin(viewer),
  replies: (post.replies || []).map((reply) => ({
    _id: reply._id,
    content: reply.content,
    createdAt: reply.createdAt,
    author: presentAuthor(reply.author, reply.isAnonymous, reply.anonymousAlias, viewer),
    parentReplyId: reply.parentReplyId || null,
    likes: reply.likedBy?.length || 0,
    liked: reply.likedBy?.some((id) => sameId(id, viewer)) || false,
    isOwner: sameId(reply.author, viewer),
    isPostAuthor: sameId(reply.author, post.author),
    canManage: sameId(post.author, viewer) || isAdmin(viewer),
  })),
});

const populatePost = (query) => query.populate("author", userFields).populate("likedBy", userFields).populate("replies.author", userFields);

exports.getPosts = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10, 1), 100);
    const total = await CfsPost.countDocuments();
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const page = Math.min(Math.max(Number.parseInt(req.query.page, 10) || 1, 1), totalPages);
    const posts = await populatePost(CfsPost.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit));
    res.json({ success: true, data: { posts: posts.map((post) => presentPost(post, req.user)), pagination: { page, limit, total, totalPages } } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Không thể tải bảng tin CFS" });
  }
};

exports.getPost = async (req, res) => {
  try {
    const post = await populatePost(CfsPost.findById(req.params.id));
    if (!post) return res.status(404).json({ success: false, message: "Không tìm thấy bài viết" });
    return res.json({ success: true, data: { post: presentPost(post, req.user) } });
  } catch (error) {
    return res.status(400).json({ success: false, message: "Không thể tải bài viết" });
  }
};

exports.getIdentity = async (req, res) => {
  res.json({ success: true, data: { alias: req.user.cfsAnonymousAlias || "", isSet: Boolean(req.user.cfsAnonymousAlias) } });
};

exports.setIdentity = async (req, res) => {
  try {
    if (req.user.cfsAnonymousAlias) {
      return res.status(409).json({ success: false, message: "Biệt danh ẩn danh đã được thiết lập và không thể thay đổi" });
    }
    const alias = String(req.body.alias || "").trim();
    if (!alias) return res.status(400).json({ success: false, message: "Vui lòng nhập biệt danh" });
    req.user.cfsAnonymousAlias = alias;
    await req.user.save();
    return res.status(201).json({ success: true, data: { alias } });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || "Không thể tạo biệt danh" });
  }
};

exports.createPost = async (req, res) => {
  try {
    const content = String(req.body.content || "").trim();
    const imageUrl = String(req.body.imageUrl || "").trim();
    const background = String(req.body.background || "").trim();
    const isAnonymous = Boolean(req.body.isAnonymous);
    if (!content && !imageUrl) return res.status(400).json({ success: false, message: "Vui lòng nhập nội dung hoặc chọn ảnh" });
    if (isAnonymous && !req.user.cfsAnonymousAlias) return res.status(400).json({ success: false, message: "Bạn cần tạo biệt danh ẩn danh trước" });
    const post = await CfsPost.create({ content, imageUrl, background, isAnonymous, anonymousAlias: isAnonymous ? req.user.cfsAnonymousAlias : "", author: req.user._id });
    await post.populate("author", userFields);
    res.status(201).json({ success: true, data: { post: presentPost(post, req.user) } });
    broadcastCfsChanged(req);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || "Không thể đăng bài" });
  }
};

exports.toggleLike = async (req, res) => {
  try {
    const post = await CfsPost.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: "Không tìm thấy bài viết" });
    const index = post.likedBy.findIndex((id) => sameId(id, req.user));
    if (index >= 0) post.likedBy.splice(index, 1); else post.likedBy.push(req.user._id);
    await post.save();
    res.json({ success: true, data: { liked: index < 0, likes: post.likedBy.length } });
    broadcastCfsChanged(req);
  } catch (error) { res.status(400).json({ success: false, message: "Không thể cập nhật lượt thích" }); }
};

exports.reply = async (req, res) => {
  try {
    const content = String(req.body.content || "").trim();
    const isAnonymous = Boolean(req.body.isAnonymous);
    const parentReplyId = req.body.parentReplyId || null;
    if (!content) return res.status(400).json({ success: false, message: "Vui lòng nhập phản hồi" });
    if (isAnonymous && !req.user.cfsAnonymousAlias) return res.status(400).json({ success: false, message: "Bạn cần tạo biệt danh ẩn danh trước" });
    const post = await CfsPost.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: "Không tìm thấy bài viết" });
    if (parentReplyId && !post.replies.some((reply) => sameId(reply._id, parentReplyId))) {
      return res.status(400).json({ success: false, message: "Không tìm thấy bình luận cần trả lời" });
    }
    post.replies.push({ content, isAnonymous, anonymousAlias: isAnonymous ? req.user.cfsAnonymousAlias : "", author: req.user._id, parentReplyId });
    await post.save();
    const hydrated = await populatePost(CfsPost.findById(post._id));
    res.status(201).json({ success: true, data: { post: presentPost(hydrated, req.user) } });
    broadcastCfsChanged(req);
  } catch (error) { res.status(400).json({ success: false, message: error.message || "Không thể gửi phản hồi" }); }
};

exports.deletePost = async (req, res) => {
  try {
    const post = await CfsPost.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: "Không tìm thấy bài viết" });
    if (!sameId(post.author, req.user) && !isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: "Bạn không có quyền xóa bài viết này" });
    }
    await post.deleteOne();
    broadcastCfsChanged(req);
    return res.json({ success: true, message: "Đã xóa bài viết" });
  } catch (error) {
    return res.status(400).json({ success: false, message: "Không thể xóa bài viết" });
  }
};

exports.deleteReply = async (req, res) => {
  try {
    const post = await CfsPost.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: "Không tìm thấy bài viết" });
    const rootReplyId = String(req.params.replyId);
    const reply = post.replies.id(rootReplyId);
    if (!reply) {
      return res.status(404).json({ success: false, message: "Không tìm thấy bình luận" });
    }
    if (!sameId(post.author, req.user) && !sameId(reply.author, req.user) && !isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: "Bạn không có quyền xóa bình luận này" });
    }
    const idsToRemove = new Set([rootReplyId]);
    let changed = true;
    while (changed) {
      changed = false;
      post.replies.forEach((reply) => {
        if (reply.parentReplyId && idsToRemove.has(String(reply.parentReplyId)) && !idsToRemove.has(String(reply._id))) {
          idsToRemove.add(String(reply._id));
          changed = true;
        }
      });
    }
    post.replies = post.replies.filter((reply) => !idsToRemove.has(String(reply._id)));
    await post.save();
    broadcastCfsChanged(req);
    return res.json({ success: true, message: "Đã xóa bình luận" });
  } catch (error) {
    return res.status(400).json({ success: false, message: "Không thể xóa bình luận" });
  }
};

exports.toggleReplyLike = async (req, res) => {
  try {
    const post = await CfsPost.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: "Không tìm thấy bài viết" });
    const reply = post.replies.id(req.params.replyId);
    if (!reply) return res.status(404).json({ success: false, message: "Không tìm thấy bình luận" });
    reply.likedBy = reply.likedBy || [];
    const index = reply.likedBy.findIndex((id) => sameId(id, req.user));
    if (index >= 0) reply.likedBy.splice(index, 1); else reply.likedBy.push(req.user._id);
    await post.save();
    broadcastCfsChanged(req);
    return res.json({ success: true, data: { liked: index < 0, likes: reply.likedBy.length } });
  } catch (error) {
    return res.status(400).json({ success: false, message: "Không thể cập nhật lượt thích" });
  }
};
