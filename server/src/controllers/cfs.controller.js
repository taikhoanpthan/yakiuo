const CfsPost = require("../models/CfsPost");
const CfsStory = require("../models/CfsStory");
const CfsNotification = require("../models/CfsNotification");
const { createCfsNotification } = require("../services/cfsNotification.service");

const userFields = "fullName username avatar avatarPosition avatarZoom coverImage coverPosition coverZoom role";
const isAdmin = (user) => user?.role === "admin";
const canPin = (user) => ["admin", "manager"].includes(user?.role);
const sameId = (left, right) => String(left?._id || left) === String(right?._id || right);
const broadcastCfsChanged = (req, data = {}) => req.app.get("io")?.emit("cfs:changed", { ...data, changedAt: Date.now() });
const broadcastCfsNotification = (req, notification) => {
  if (!notification?.recipient) return;
  req.app.get("io")?.to(`user:${notification.recipient}`).emit("cfs:notification", { unreadIncrement: 1, notificationId: String(notification._id) });
};

const audiusAppName = process.env.AUDIUS_APP_NAME || "yakiuo_erp";
let audiusHostCache = { host: "", expiresAt: 0 };
const getAudiusHost = async () => {
  if (audiusHostCache.host && audiusHostCache.expiresAt > Date.now()) return audiusHostCache.host;
  const response = await fetch("https://api.audius.co");
  if (!response.ok) throw new Error("Audius hiện không khả dụng");
  const payload = await response.json();
  const host = Array.isArray(payload?.data) ? payload.data.find((item) => typeof item === "string" && item.startsWith("https://")) : "";
  if (!host) throw new Error("Không tìm thấy máy chủ Audius");
  audiusHostCache = { host: host.replace(/\/$/, ""), expiresAt: Date.now() + 30 * 60 * 1000 };
  return audiusHostCache.host;
};

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
  isPinned: Boolean(post.isPinned),
  pinnedAt: post.pinnedAt || null,
  canPin: canPin(viewer),
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
const presentStory = (story, viewer) => ({
  _id: story._id,
  content: story.content,
  imageUrl: story.imageUrl || "",
  background: story.background || "#334155",
  music: story.music?.trackId ? {
    provider: story.music.provider || "audius",
    trackId: story.music.trackId,
    title: story.music.title || "Bài hát Audius",
    artist: story.music.artist || "",
    artworkUrl: story.music.artworkUrl || "",
    duration: story.music.duration || 0,
    startAt: story.music.startAt || 0,
    embedUrl: story.music.embedUrl || "",
  } : null,
  createdAt: story.createdAt,
  expiresAt: story.expiresAt,
  author: {
    _id: story.author?._id,
    name: story.author?.fullName || story.author?.username || "Yakiuo member",
    avatar: story.author?.avatar || "",
    avatarPosition: story.author?.avatarPosition,
    avatarZoom: story.author?.avatarZoom,
  },
  canManage: sameId(story.author, viewer) || isAdmin(viewer),
});

const notificationActorName = (notification) => notification.isAnonymous
  ? "Một thành viên ẩn danh"
  : (notification.actor?.fullName || notification.actor?.username || "Một thành viên");

const presentNotification = (notification) => {
  const actor = notificationActorName(notification);
  const action = notification.type === "post_like"
    ? "đã thích bài viết của bạn"
    : notification.type === "reply_like"
      ? "đã thích bình luận của bạn"
      : notification.type === "post_reply"
        ? "đã bình luận về bài viết của bạn"
        : "đã trả lời bình luận của bạn";
  const postPreview = String(notification.post?.content || "").trim() || (notification.post?.imageUrl ? "Ảnh bạn đã đăng" : "Bài viết CFS");
  return { _id: notification._id, postId: notification.post?._id || notification.post, type: notification.type, actor, content: `${actor} ${action}`, postPreview, createdAt: notification.createdAt, read: Boolean(notification.readAt) };
};

exports.getActivity = async (req, res) => {
  try {
    const notifications = await CfsNotification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 }).limit(30).populate("actor", userFields).populate("post", "content imageUrl").lean();
    res.json({ success: true, data: { notifications: notifications.map(presentNotification), unreadCount: notifications.filter((item) => !item.readAt).length } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Không thể tải hoạt động CFS" });
  }
};

exports.markActivityRead = async (req, res) => {
  try {
    await CfsNotification.updateMany({ recipient: req.user._id, readAt: null }, { $set: { readAt: new Date() } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Không thể cập nhật thông báo" });
  }
};

exports.markActivityItemRead = async (req, res) => {
  try {
    await CfsNotification.updateOne({ _id: req.params.notificationId, recipient: req.user._id, readAt: null }, { $set: { readAt: new Date() } });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, message: "Không thể cập nhật thông báo" });
  }
};

exports.deleteActivityItem = async (req, res) => {
  try {
    const notification = await CfsNotification.findOneAndDelete({ _id: req.params.notificationId, recipient: req.user._id });
    if (!notification) return res.status(404).json({ success: false, message: "Không tìm thấy thông báo" });
    return res.json({ success: true });
  } catch (error) {
    return res.status(400).json({ success: false, message: "Không thể xóa thông báo" });
  }
};

exports.getPosts = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10, 1), 100);
    const total = await CfsPost.countDocuments();
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const page = Math.min(Math.max(Number.parseInt(req.query.page, 10) || 1, 1), totalPages);
    const posts = await populatePost(CfsPost.find().sort({ isPinned: -1, pinnedAt: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit));
    res.json({ success: true, data: { posts: posts.map((post) => presentPost(post, req.user)), pagination: { page, limit, total, totalPages } } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Không thể tải bảng tin CFS" });
  }
};

exports.getStories = async (req, res) => {
  try {
    const stories = await CfsStory.find({ expiresAt: { $gt: new Date() } })
      .sort({ createdAt: -1 })
      .populate("author", userFields);
    return res.json({ success: true, data: { stories: stories.map((story) => presentStory(story, req.user)) } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Không thể tải Story" });
  }
};

exports.searchAudiusTracks = async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();
    if (query.length < 2) return res.status(400).json({ success: false, message: "Nhập ít nhất 2 ký tự để tìm nhạc" });
    const host = await getAudiusHost();
    const url = new URL(`${host}/v1/tracks/search`);
    url.searchParams.set("query", query.slice(0, 100));
    url.searchParams.set("limit", "30");
    url.searchParams.set("app_name", audiusAppName);
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("Audius không trả về kết quả");
    const payload = await response.json();
    const tracks = (Array.isArray(payload?.data) ? payload.data : []).map((track) => ({
      provider: "audius",
      trackId: String(track.id || ""),
      title: String(track.title || "Bài hát không tên").slice(0, 200),
      artist: String(track.user?.name || track.user?.handle || "Audius").slice(0, 160),
      artworkUrl: track.artwork?.["150x150"] || track.artwork?.["480x480"] || "",
      duration: Number(track.duration) || 0,
      startAt: 0,
    })).filter((track) => track.trackId);
    return res.json({ success: true, data: { tracks } });
  } catch (error) {
    return res.status(502).json({ success: false, message: "Không thể tìm nhạc Audius lúc này" });
  }
};

exports.streamAudiusTrack = async (req, res) => {
  try {
    const trackId = String(req.params.trackId || "");
    if (!/^[A-Za-z0-9_-]{1,120}$/.test(trackId)) return res.status(400).json({ success: false, message: "Mã bài hát không hợp lệ" });
    const host = await getAudiusHost();
    const url = new URL(`${host}/v1/tracks/${encodeURIComponent(trackId)}/stream`);
    url.searchParams.set("app_name", audiusAppName);
    return res.redirect(302, url.toString());
  } catch (error) {
    return res.status(502).json({ success: false, message: "Không thể phát nhạc Audius lúc này" });
  }
};

exports.resolveExternalMusic = async (req, res) => {
  try {
    const sourceUrl = String(req.body?.url || "").trim();
    const parsedUrl = new URL(sourceUrl);
    if (parsedUrl.hostname === "open.spotify.com") {
      const trackMatch = parsedUrl.pathname.match(/^\/track\/([A-Za-z0-9]+)$/);
      if (!trackMatch) return res.status(400).json({ success: false, message: "Hãy dán link một bài hát Spotify" });
      const oembedUrl = new URL("https://open.spotify.com/oembed");
      oembedUrl.searchParams.set("url", sourceUrl);
      const response = await fetch(oembedUrl, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("Spotify không trả về bài hát");
      const payload = await response.json();
      return res.json({ success: true, data: { music: { provider: "spotify", trackId: trackMatch[1], title: String(payload.title || "Bài hát Spotify").slice(0, 200), artist: "Spotify", artworkUrl: String(payload.thumbnail_url || "").slice(0, 1000), embedUrl: `https://open.spotify.com/embed/track/${trackMatch[1]}`, duration: 0, startAt: 0 } } });
    }
    const isYoutube = ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"].includes(parsedUrl.hostname);
    if (!isYoutube) return res.status(400).json({ success: false, message: "Chỉ hỗ trợ link Spotify hoặc YouTube" });
    const videoId = parsedUrl.hostname === "youtu.be"
      ? parsedUrl.pathname.split("/").filter(Boolean)[0]
      : parsedUrl.searchParams.get("v") || parsedUrl.pathname.match(/^\/(?:shorts|embed)\/([A-Za-z0-9_-]{11})/)?.[1];
    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId || "")) return res.status(400).json({ success: false, message: "Hãy dán link video YouTube hợp lệ" });
    const oembedUrl = new URL("https://www.youtube.com/oembed");
    oembedUrl.searchParams.set("url", sourceUrl);
    oembedUrl.searchParams.set("format", "json");
    const response = await fetch(oembedUrl, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("YouTube không trả về video");
    const payload = await response.json();
    return res.json({ success: true, data: { music: { provider: "youtube", trackId: videoId, title: String(payload.title || "Video YouTube").slice(0, 200), artist: String(payload.author_name || "YouTube").slice(0, 160), artworkUrl: String(payload.thumbnail_url || "").slice(0, 1000), embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`, duration: 0, startAt: 0 } } });
  } catch (error) {
    return res.status(400).json({ success: false, message: "Không thể đọc link nhạc này" });
  }
};

exports.createStory = async (req, res) => {
  try {
    const content = String(req.body.content || "").trim();
    const imageUrl = String(req.body.imageUrl || "").trim();
    const background = String(req.body.background || "#334155").trim();
    const rawMusic = req.body.music && typeof req.body.music === "object" ? req.body.music : null;
    const externalProvider = ["spotify", "youtube"].includes(rawMusic?.provider) ? rawMusic.provider : "";
    const music = rawMusic?.trackId ? {
      provider: externalProvider || "audius",
      trackId: String(rawMusic.trackId).trim().slice(0, 120),
      title: String(rawMusic.title || "Bài hát Audius").trim().slice(0, 200),
      artist: String(rawMusic.artist || "").trim().slice(0, 160),
      artworkUrl: String(rawMusic.artworkUrl || "").trim().slice(0, 1000),
      duration: Math.max(0, Math.min(Number(rawMusic.duration) || 0, 7200)),
      startAt: Math.max(0, Math.min(Number(rawMusic.startAt) || 0, 7200)),
      embedUrl: externalProvider === "spotify" ? `https://open.spotify.com/embed/track/${String(rawMusic.trackId).trim().slice(0, 120)}` : externalProvider === "youtube" ? `https://www.youtube-nocookie.com/embed/${String(rawMusic.trackId).trim().slice(0, 120)}?autoplay=1&rel=0` : "",
    } : undefined;
    if (!content && !imageUrl && !music) return res.status(400).json({ success: false, message: "Vui lòng nhập nội dung, chọn ảnh hoặc thêm nhạc" });
    if (music && !/^[A-Za-z0-9_-]{1,120}$/.test(music.trackId)) return res.status(400).json({ success: false, message: "Bài hát không hợp lệ" });
    const story = await CfsStory.create({ content, imageUrl, background, music, author: req.user._id, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) });
    await story.populate("author", userFields);
    return res.status(201).json({ success: true, data: { story: presentStory(story, req.user) } });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || "Không thể đăng Story" });
  }
};

exports.deleteStory = async (req, res) => {
  try {
    const story = await CfsStory.findById(req.params.storyId);
    if (!story) return res.status(404).json({ success: false, message: "Không tìm thấy Story" });
    if (!sameId(story.author, req.user) && !isAdmin(req.user)) return res.status(403).json({ success: false, message: "Bạn không có quyền xóa Story này" });
    await story.deleteOne();
    return res.json({ success: true });
  } catch (error) {
    return res.status(400).json({ success: false, message: "Không thể xóa Story" });
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
    broadcastCfsChanged(req, { postId: String(post._id), action: "created" });
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
    if (index < 0) {
      const notification = await createCfsNotification({ recipient: post.author, actor: req.user._id, post: post._id, type: "post_like" });
      broadcastCfsNotification(req, notification);
    }
    res.json({ success: true, data: { liked: index < 0, likes: post.likedBy.length } });
    broadcastCfsChanged(req, { postId: String(post._id), action: "updated" });
  } catch (error) { res.status(400).json({ success: false, message: "Không thể cập nhật lượt thích" }); }
};

exports.togglePin = async (req, res) => {
  try {
    if (!canPin(req.user)) {
      return res.status(403).json({ success: false, message: "Chỉ Admin hoặc Manager mới có quyền ghim bài viết" });
    }
    const post = await CfsPost.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: "Không tìm thấy bài viết" });
    post.isPinned = !post.isPinned;
    post.pinnedAt = post.isPinned ? new Date() : null;
    post.pinnedBy = post.isPinned ? req.user._id : null;
    await post.save();
    const hydrated = await populatePost(CfsPost.findById(post._id));
    res.json({ success: true, data: { post: presentPost(hydrated, req.user) } });
    broadcastCfsChanged(req, { postId: String(post._id), action: "updated" });
  } catch (error) {
    return res.status(400).json({ success: false, message: "Không thể cập nhật trạng thái ghim" });
  }
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
    const newReply = post.replies[post.replies.length - 1];
    await post.save();
    const notifications = [{ recipient: post.author, type: parentReplyId ? "reply" : "post_reply" }];
    if (parentReplyId) notifications.push({ recipient: post.replies.id(parentReplyId)?.author, type: "reply" });
    const recipients = new Map();
    notifications.filter(({ recipient }) => recipient).forEach(({ recipient, type }) => recipients.set(String(recipient), { recipient, type }));
    const createdNotifications = await Promise.all([...recipients.values()].map(({ recipient, type }) => createCfsNotification({ recipient, actor: req.user._id, post: post._id, replyId: newReply._id, type, isAnonymous })));
    createdNotifications.forEach((notification) => broadcastCfsNotification(req, notification));
    const hydrated = await populatePost(CfsPost.findById(post._id));
    res.status(201).json({ success: true, data: { post: presentPost(hydrated, req.user) } });
    broadcastCfsChanged(req, { postId: String(post._id), action: "updated" });
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
    broadcastCfsChanged(req, { postId: String(post._id), action: "deleted" });
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
    broadcastCfsChanged(req, { postId: String(post._id), action: "updated" });
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
    if (index < 0) {
      const notification = await createCfsNotification({ recipient: reply.author, actor: req.user._id, post: post._id, replyId: reply._id, type: "reply_like" });
      broadcastCfsNotification(req, notification);
    }
    broadcastCfsChanged(req, { postId: String(post._id), action: "updated" });
    return res.json({ success: true, data: { liked: index < 0, likes: reply.likedBy.length } });
  } catch (error) {
    return res.status(400).json({ success: false, message: "Không thể cập nhật lượt thích" });
  }
};
