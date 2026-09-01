import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Input,
  Modal,
  Popconfirm,
  Select,
  Switch,
  message,
} from "antd";
import {
  BellOutlined,
  CloseOutlined,
  DeleteOutlined,
  HeartFilled,
  HeartOutlined,
  MessageOutlined,
  MoreOutlined,
  PictureOutlined,
  ReloadOutlined,
  SendOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "../../store/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import {
  createCfsPost,
  createCfsReply,
  deleteCfsActivityItem,
  deleteCfsPost,
  deleteCfsReply,
  getCfsActivity,
  getCfsIdentity,
  getCfsPost,
  getCfsPosts,
  markCfsActivityItemRead,
  setCfsIdentity,
  toggleCfsLike,
  toggleCfsReplyLike,
  uploadCfsImage,
} from "../../services/cfs.service";
import { onCfsChanged, onCfsNotification, onOnlineUsers } from "../../services/socket";
import UserAvatar from "../../components/common/UserAvatar";
import "./Cfs.css";

const timeAgo = (value) => {
  const minutes = Math.floor(
    Math.max(0, Date.now() - new Date(value).getTime()) / 60000,
  );
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return `${minutes}p`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
  return dayjs(value).format("DD/MM/YYYY");
};
const anonymousAvatarStyles = [
  ["#f97316", "#fdba74", "#7c2d12"],
  ["#2563eb", "#93c5fd", "#1e3a8a"],
  ["#7c3aed", "#c4b5fd", "#4c1d95"],
  ["#db2777", "#f9a8d4", "#831843"],
  ["#059669", "#6ee7b7", "#064e3b"],
  ["#0891b2", "#67e8f9", "#164e63"],
];
const anonymousAvatarCache = new Map();
const postBackgrounds = [
  { id: "", label: "Không nền", value: "" },
  {
    id: "berry",
    label: "Hồng tím",
    value: "linear-gradient(135deg, #e0006e, #4b2bc9)",
  },
  {
    id: "ocean",
    label: "Đại dương",
    value: "linear-gradient(135deg, #0f766e, #2563eb)",
  },
  {
    id: "sunset",
    label: "Hoàng hôn",
    value: "linear-gradient(135deg, #f97316, #db2777)",
  },
  {
    id: "night",
    label: "Đêm",
    value: "linear-gradient(135deg, #111827, #4c1d95)",
  },
];
const extraPostBackgrounds = [
  {
    id: "lgbt",
    label: "Cầu vồng LGBT",
    value:
      "linear-gradient(135deg, #e40303 0%, #ff8c00 20%, #ffed00 40%, #008026 60%, #24408e 80%, #732982 100%)",
  },
  {
    id: "sky",
    label: "Bầu trời",
    value: "linear-gradient(135deg, #06b6d4, #3b82f6)",
  },
  {
    id: "forest",
    label: "Rừng xanh",
    value: "linear-gradient(135deg, #15803d, #84cc16)",
  },
  {
    id: "rose",
    label: "Hoa hồng",
    value: "linear-gradient(135deg, #fb7185, #a855f7)",
  },
  {
    id: "gold",
    label: "Nắng vàng",
    value: "linear-gradient(135deg, #facc15, #f97316)",
  },
  {
    id: "slate",
    label: "Than chì",
    value: "linear-gradient(135deg, #334155, #020617)",
  },
];
const getPostBackground = (id) =>
  [...postBackgrounds, ...extraPostBackgrounds].find(
    (background) => background.id === id,
  )?.value || "";
const anonymousAvatarSeed = (value = "Ẩn danh") =>
  [...String(value)].reduce(
    (hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0,
    0,
  );
const getAnonymousAvatar = (author) => {
  const cacheKey = author?.name || "Ẩn danh";
  const cachedAvatar = anonymousAvatarCache.get(cacheKey);
  if (cachedAvatar) return cachedAvatar;

  const seed = anonymousAvatarSeed(cacheKey);
  const [background, accent, detail] =
    anonymousAvatarStyles[seed % anonymousAvatarStyles.length];
  const mouth = ["M23 42c5 5 13 5 18 0", "M23 44c5-4 13-4 18 0", "M25 42h14"][
    seed % 3
  ];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="${background}"/><circle cx="32" cy="27" r="17" fill="${accent}"/><path d="M13 64c2-15 10-23 19-23s17 8 19 23" fill="${detail}"/><circle cx="26" cy="27" r="2.5" fill="${detail}"/><circle cx="38" cy="27" r="2.5" fill="${detail}"/><path d="${mouth}" fill="none" stroke="${detail}" stroke-width="2.6" stroke-linecap="round"/></svg>`;
  const avatar = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  anonymousAvatarCache.set(cacheKey, avatar);
  return avatar;
};
const CfsAvatar = ({ author, size = 40, online = false }) => (
  <span className="cfs-avatar-wrap">
    <UserAvatar
      size={size}
      user={author}
      src={author?.anonymous ? getAnonymousAvatar(author) : undefined}
      className={
        author?.anonymous ? "cfs-avatar cfs-avatar-anonymous" : "cfs-avatar"
      }
    >
      {author?.anonymous ? "?" : <UserOutlined />}
    </UserAvatar>
    {online && <i className="cfs-online-dot" />}
  </span>
);
const Author = ({ author, createdAt, admin, isPostAuthor = false }) => (
  <div className="cfs-author">
    <span>{author?.name}</span>
    {author?.anonymous && <em>ẩn danh</em>}
    <time>· {timeAgo(createdAt)}</time>
    {isPostAuthor && <b>Tác giả</b>}
    {admin && author?.identity && (
      <small>
        Admin: {author.identity.fullName} · @{author.identity.username}
      </small>
    )}
  </div>
);
const PostHeader = ({ author, createdAt, admin }) => (
  <div className="cfs-post-header">
    <Author author={author} createdAt={createdAt} admin={admin} />
    <button
      type="button"
      className="cfs-more-action"
      aria-label="Tùy chọn bài viết"
    >
      <MoreOutlined />
    </button>
  </div>
);
const groupReplies = (replies) =>
  replies.reduce((groups, reply) => {
    const key = String(reply.parentReplyId || "root");
    (groups[key] ||= []).push(reply);
    return groups;
  }, {});
const AnonymousToggle = ({ enabled, alias, onChange }) => {
  const [uploading, setUploading] = useState(false);
  const uploadImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const response = await uploadCfsImage(file);
      const url = response.data?.data?.url || "";
      if (!url) throw new Error("Không nhận được URL ảnh");
      window.dispatchEvent(
        new CustomEvent("cfs:image-selected", { detail: url }),
      );
      message.success("Đã thêm ảnh vào bài viết");
    } catch {
      message.error("Không thể tải ảnh lên");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };
  return (
    <div className="cfs-anon-control">
      <span>Đăng ẩn danh</span>
      <Switch size="small" checked={enabled} onChange={onChange} />
      <label className="cfs-image-picker" title="Thêm ảnh">
        <PictureOutlined />
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={uploadImage}
          disabled={uploading}
        />
      </label>
      {enabled && alias && <small>Biệt danh: {alias}</small>}
    </div>
  );
};

const CreatePostForm = ({
  displayName,
  initialAnonymous,
  alias,
  requestAnonymous,
  onSubmit,
}) => {
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [background, setBackground] = useState("");
  const [showMoreBackgrounds, setShowMoreBackgrounds] = useState(false);
  const [anonymous, setAnonymous] = useState(initialAnonymous);
  const [submitting, setSubmitting] = useState(false);
  const uploadImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const response = await uploadCfsImage(file);
      setImageUrl(response.data?.data?.url || "");
    } catch {
      message.error("Không thể tải ảnh lên");
    }
  };
  const submit = async () => {
    if (!content.trim() && !imageUrl)
      return message.warning("Viết điều bạn muốn chia sẻ hoặc chọn ảnh");
    try {
      setSubmitting(true);
      await onSubmit({ content, imageUrl, background, isAnonymous: anonymous });
      Modal.destroyAll();
    } finally {
      setSubmitting(false);
    }
  };
  const backgrounds = showMoreBackgrounds
    ? [...postBackgrounds, ...extraPostBackgrounds]
    : postBackgrounds;
  return (
    <div className="cfs-create-form">
      <div
        className={`cfs-create-editor ${background ? "has-background" : ""}`}
        style={
          background ? { background: getPostBackground(background) } : undefined
        }
      >
        <Input.TextArea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder={`${displayName} đang nghĩ gì?`}
          autoSize={{ minRows: 7, maxRows: 10 }}
          maxLength={2000}
          autoFocus
        />
        {imageUrl && <img src={imageUrl} alt="Ảnh đính kèm" />}
      </div>
      <div className="cfs-background-picker">
        {backgrounds.map((item) => (
          <button
            key={item.id || "plain"}
            type="button"
            title={item.label}
            className={background === item.id ? "is-selected" : ""}
            style={item.value ? { background: item.value } : undefined}
            onClick={() => setBackground(item.id)}
          >
            {item.id ? "" : "A"}
          </button>
        ))}
        <button
          type="button"
          className="cfs-more-backgrounds"
          title="Thêm màu nền"
          onClick={() => setShowMoreBackgrounds((value) => !value)}
        >
          {showMoreBackgrounds ? "−" : "+"}
        </button>
      </div>
      <div className="cfs-create-footer">
        <AnonymousToggle
          enabled={anonymous}
          alias={alias}
          onChange={(value) => {
            setAnonymous(value);
            requestAnonymous(value, "post");
          }}
        />
        <label className="cfs-image-picker">
          <PictureOutlined />
          <span>Thêm ảnh</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={uploadImage}
          />
        </label>
        <Button onClick={() => Modal.destroyAll()}>Hủy</Button>
        <Button
          type="primary"
          icon={<SendOutlined />}
          loading={submitting}
          onClick={submit}
        >
          Đăng
        </Button>
      </div>
    </div>
  );
};

const Replies = ({
  replies,
  admin,
  onlineUsers,
  onReply,
  onLike,
  onDelete,
  sortMode,
}) => {
  const groups = useMemo(() => groupReplies(replies), [replies]);
  const childrenOf = (id) =>
    (groups[String(id)] || [])
      .slice()
      .sort((a, b) =>
        sortMode === "top"
          ? b.likes - a.likes || new Date(b.createdAt) - new Date(a.createdAt)
          : new Date(b.createdAt) - new Date(a.createdAt),
      );
  const renderReply = (reply, depth = 0, replyingTo) => {
    const displayedAuthor = replyingTo
      ? reply.author?.anonymous
        ? {
            ...replyingTo,
            name: `${reply.author.name} > ${replyingTo.name}`,
            anonymous: false,
          }
        : replyingTo
      : reply.author;
    return (
      <div
        className={`cfs-reply-branch ${depth ? "is-nested" : ""}`}
        key={reply._id}
        style={{ "--reply-depth": depth }}
      >
        <div className="cfs-reply">
          <CfsAvatar
            author={reply.author}
            size={30}
            online={onlineUsers.has(String(reply.author?.userId))}
          />
          <div className="cfs-reply-content">
            <Author
              author={displayedAuthor}
              createdAt={reply.createdAt}
              admin={admin}
              isPostAuthor={replyingTo ? false : reply.isPostAuthor}
            />
            <p>{reply.content}</p>
            <div className="cfs-reply-actions">
              <button
                type="button"
                className={reply.liked ? "is-liked" : ""}
                onClick={() => onLike(reply)}
              >
                {reply.liked ? <HeartFilled /> : <HeartOutlined />}
                {reply.likes > 0 && <span>{reply.likes}</span>}
              </button>
              <button type="button" onClick={() => onReply(reply)}>
                Trả lời
              </button>
              {reply.canManage && (
                <Popconfirm
                  title="Xóa phản hồi này?"
                  description="Các phản hồi bên dưới cũng sẽ bị xóa."
                  okText="Xóa"
                  cancelText="Hủy"
                  onConfirm={() => onDelete(reply._id)}
                >
                  <button
                    type="button"
                    className="cfs-delete-action"
                    aria-label="Xóa phản hồi"
                  >
                    <DeleteOutlined />
                  </button>
                </Popconfirm>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };
  const flattenChildren = (parent) =>
    childrenOf(parent._id).flatMap((child) => [
      renderReply(child, 1, parent.author),
      ...flattenChildren(child),
    ]);
  return childrenOf("root").flatMap((reply) => [
    renderReply(reply),
    ...flattenChildren(reply),
  ]);
};

const PostActions = ({ post, onLike, onOpenReplies, showDelete, onDelete }) => {
  const markerRef = useRef(null);

  useEffect(() => {
    const content = markerRef.current
      ?.closest(".cfs-post-body")
      ?.querySelector(":scope > p");
    if (!content || !post.background) return;
    Object.assign(content.style, {
      background: getPostBackground(post.background),
      color: "#fff",
      minHeight: "180px",
      display: "grid",
      placeItems: "center",
      padding: "24px",
      borderRadius: "12px",
      textAlign: "center",
      fontSize: "21px",
      fontWeight: "800",
      lineHeight: "1.35",
    });
  }, [post.background]);

  return (
    <>
      {post.background && (
        <i
          ref={markerRef}
          className="cfs-post-background-marker"
          data-post-background={post.background}
          aria-hidden="true"
        />
      )}
      {post.imageUrl && (
        <img
          className="cfs-post-image"
          src={post.imageUrl}
          alt="Ảnh bài viết"
        />
      )}
      <div className="cfs-actions">
        <button
          type="button"
          aria-label="Thích bài viết"
          className={post.liked ? "is-liked" : ""}
          onClick={() => onLike(post._id)}
        >
          {post.liked ? <HeartFilled /> : <HeartOutlined />}
          {post.likes > 0 && <span>{post.likes}</span>}
        </button>
        {post.likeUsers?.length > 0 && (
          <span
            className="cfs-like-avatars"
            title={post.likeUsers.map((user) => user.name).join(", ")}
          >
            {post.likeUsers.slice(0, 2).map((user) => (
              <UserAvatar key={String(user._id)} size={18} user={user}>
                {user.name.slice(0, 1)}
              </UserAvatar>
            ))}
            {post.likeUsers.length > 2 && <b>+{post.likeUsers.length - 2}</b>}
          </span>
        )}
        <button
          type="button"
          aria-label="Xem bình luận"
          onClick={onOpenReplies}
        >
          <MessageOutlined />
          {post.replies?.length > 0 && <span>{post.replies.length}</span>}
        </button>
        {showDelete && (
          <Popconfirm
            title="Xóa bài viết này?"
            description="Toàn bộ phản hồi cũng sẽ bị xóa."
            okText="Xóa"
            cancelText="Hủy"
            onConfirm={() => onDelete(post._id)}
          >
            <button
              type="button"
              className="cfs-delete-action"
              aria-label="Xóa bài viết"
            >
              <DeleteOutlined />
            </button>
          </Popconfirm>
        )}
      </div>
    </>
  );
};
const PostText = ({ post }) =>
  post.background ? (
    <div
      className="cfs-post-text cfs-post-text-background"
      style={{ background: getPostBackground(post.background) }}
    >
      {post.content}
    </div>
  ) : (
    <p>{post.content}</p>
  );

const CfsActivityBell = ({ onOpenPost, elevated = false }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [bellPosition, setBellPosition] = useState(null);
  const dragStartRef = useRef(null);
  const draggedRef = useRef(false);
  const loadActivity = useCallback(async () => {
    try {
      const response = await getCfsActivity();
      setNotifications(response.data?.data?.notifications || []);
      setUnreadCount(response.data?.data?.unreadCount || 0);
    } catch {
      /* Không làm gián đoạn bảng tin nếu tải hoạt động thất bại. */
    }
  }, []);
  useEffect(() => {
    loadActivity();
    return onCfsNotification(({ unreadIncrement = 1 } = {}) => {
      setUnreadCount((count) => count + unreadIncrement);
      loadActivity();
    });
  }, [loadActivity]);
  const openNotification = async (item) => {
    if (!item.read) {
      setUnreadCount((count) => Math.max(0, count - 1));
      setNotifications((items) =>
        items.map((current) =>
          current._id === item._id ? { ...current, read: true } : current,
        ),
      );
      try {
        await markCfsActivityItemRead(item._id);
      } catch {
        loadActivity();
      }
    }
    setOpen(false);
    onOpenPost(item.postId);
  };
  const deleteNotification = async (event, item) => {
    event.preventDefault();
    event.stopPropagation();
    setNotifications((items) =>
      items.filter((current) => current._id !== item._id),
    );
    if (!item.read) setUnreadCount((count) => Math.max(0, count - 1));
    try {
      await deleteCfsActivityItem(item._id);
    } catch {
      loadActivity();
    }
  };
  const moveBellTo = (clientX, clientY) => {
    const drag = dragStartRef.current;
    if (!drag) return;
    const left = Math.min(Math.max(8, clientX - drag.offsetX), window.innerWidth - 50);
    const top = Math.min(Math.max(8, clientY - drag.offsetY), window.innerHeight - 50);
    draggedRef.current = true;
    setBellPosition({ left, top });
  };
  const finishDragging = () => {
    if (!dragStartRef.current) return;
    dragStartRef.current = null;
  };
  const prepareDragging = (clientX, clientY, target) => {
    const bounds = target.getBoundingClientRect();
    dragStartRef.current = { offsetX: clientX - bounds.left, offsetY: clientY - bounds.top };
    draggedRef.current = false;
  };
  const startMouseDragging = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    prepareDragging(event.clientX, event.clientY, event.currentTarget);
    const onMove = (moveEvent) => moveBellTo(moveEvent.clientX, moveEvent.clientY);
    const onUp = () => { finishDragging(); window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };
  const startTouchDragging = (event) => {
    const touch = event.touches[0];
    if (!touch) return;
    prepareDragging(touch.clientX, touch.clientY, event.currentTarget);
    const onMove = (moveEvent) => { const nextTouch = moveEvent.touches[0]; if (!nextTouch) return; moveEvent.preventDefault(); moveBellTo(nextTouch.clientX, nextTouch.clientY); };
    const onEnd = () => { const wasDragged = draggedRef.current; finishDragging(); if (!wasDragged) setOpen(true); window.removeEventListener("touchmove", onMove); window.removeEventListener("touchend", onEnd); window.removeEventListener("touchcancel", onEnd); };
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
  };
  const openModal = () => {
    if (draggedRef.current) { draggedRef.current = false; return; }
    setOpen(true);
  };
  return (
    <>
      <div className={`cfs-activity-badge ${elevated ? "is-elevated" : ""}`} style={bellPosition ? { left: bellPosition.left, top: bellPosition.top, right: "auto", bottom: "auto" } : undefined}>
        <button
          type="button"
          className="cfs-activity-bell"
          aria-label="Thông báo CFS"
          onClick={openModal}
          onMouseDown={startMouseDragging}
          onTouchStart={startTouchDragging}
        >
          <BellOutlined />
        </button>
        {unreadCount > 0 && <span className="cfs-activity-count">{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </div>
      <Modal
        open={open}
        title="Thông báo CFS"
        footer={null}
        onCancel={() => setOpen(false)}
        centered
        width={430}
        className="cfs-activity-modal"
      >
        <div className="cfs-activity-panel">
          {notifications.length ? (
            <div className="cfs-activity-list">
              {notifications.map((item) => (
                <button
                  type="button"
                  key={item._id}
                  className={`cfs-activity-item ${item.read ? "" : "is-unread"}`}
                  onClick={() => openNotification(item)}
                >
                  <span className="cfs-activity-icon">
                    {item.type.includes("like") ? "♥" : "↩"}
                  </span>
                  <span>
                    <b>{item.content}</b>
                    <small className="cfs-activity-post">
                      Bài viết: {item.postPreview}
                    </small>
                    <small>{timeAgo(item.createdAt)}</small>
                  </span>
                  {!item.read && (
                    <i className="cfs-activity-dot" aria-label="Chưa đọc" />
                  )}
                  <span
                    role="button"
                    tabIndex={0}
                    className="cfs-activity-delete"
                    aria-label="Xóa thông báo"
                    onClick={(event) => deleteNotification(event, item)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ")
                        deleteNotification(event, item);
                    }}
                  >
                    <DeleteOutlined />
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="cfs-activity-empty">Chưa có hoạt động mới.</p>
          )}
        </div>
      </Modal>
    </>
  );
};

const DetailPage = ({
  post,
  onClose,
  admin,
  onlineUsers,
  viewer,
  onLike,
  onDeletePost,
  onDeleteReply,
  onLikeReply,
  replyingTo,
  setReplyingTo,
  replyContent,
  setReplyContent,
  replyAnonymous,
  setReplyAnonymous,
  alias,
  requestAnonymous,
  onSendReply,
  replySubmitting,
  replySort,
  setReplySort,
}) =>
  post && (
    <div className="cfs-page cfs-detail-page">
      {post && (
        <div className={`cfs-detail ${post.replies?.length ? "" : "is-empty"}`}>
          <header className="cfs-detail-header">
            <Button type="text" icon={<CloseOutlined />} onClick={onClose}>
              Đóng
            </Button>
            <strong>Bài viết</strong>
            <span />
          </header>
          <div className="cfs-detail-scroll">
            <article className="cfs-post cfs-detail-post">
              <div className="cfs-post-grid">
                <CfsAvatar
                  author={post.author}
                  online={onlineUsers.has(String(post.author?.userId))}
                />
                <div className="cfs-post-body">
                  <PostHeader
                    author={post.author}
                    createdAt={post.createdAt}
                    admin={admin}
                  />
                  <p>{post.content}</p>
                  <PostActions
                    post={post}
                    onLike={onLike}
                    onOpenReplies={() => {}}
                    showDelete={post.canManage}
                    onDelete={onDeletePost}
                  />
                </div>
              </div>
            </article>
            <div className="cfs-detail-sort">
              <Select
                size="small"
                variant="borderless"
                value={replySort}
                onChange={setReplySort}
                options={[
                  { value: "top", label: "↕ Hàng đầu" },
                  { value: "newest", label: "Mới nhất" },
                ]}
              />
              <span>{post.replies?.length || 0} phản hồi</span>
            </div>
            <section className="cfs-replies cfs-detail-replies">
              <Replies
                replies={post.replies || []}
                sortMode={replySort}
                admin={admin}
                onlineUsers={onlineUsers}
                onReply={(reply) =>
                  setReplyingTo({
                    postId: post._id,
                    parentReplyId: reply._id,
                    name: reply.author.name,
                  })
                }
                onDelete={(replyId) => onDeleteReply(post._id, replyId)}
                onLike={(reply) => onLikeReply(post._id, reply)}
              />
            </section>
          </div>
          <footer className="cfs-detail-composer">
            <CfsAvatar author={{ avatar: viewer?.avatar }} size={32} />
            <div>
              <Input.TextArea
                value={replyContent}
                onChange={(event) => setReplyContent(event.target.value)}
                placeholder={
                  replyingTo
                    ? `Trả lời ${replyingTo.name}...`
                    : `Trả lời ${post.author.name}...`
                }
                autoSize={{ minRows: 1, maxRows: 3 }}
                maxLength={1000}
              />
              <div className="cfs-reply-footer">
                <AnonymousToggle
                  enabled={replyAnonymous}
                  alias={alias}
                  onChange={(value) => requestAnonymous(value, "reply")}
                />
                <Button
                  type="primary"
                  size="small"
                  loading={replySubmitting}
                  disabled={!replyContent.trim() || replySubmitting}
                  onClick={onSendReply}
                >
                  Gửi
                </Button>
              </div>
            </div>
          </footer>
        </div>
      )}
    </div>
  );
const DetailModal = DetailPage;

const Cfs = () => {
  const { user } = useAuth();
  const Avatar = (props) => <UserAvatar user={user} {...props} />;
  const { postId } = useParams();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [background, setBackground] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [alias, setAlias] = useState("");
  const [aliasDraft, setAliasDraft] = useState("");
  const [aliasModalOpen, setAliasModalOpen] = useState(false);
  const [aliasTarget, setAliasTarget] = useState(null);
  const [savingAlias, setSavingAlias] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [detailPost, setDetailPost] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState("");
  const [replyAnonymous, setReplyAnonymous] = useState(false);
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [replySort, setReplySort] = useState("top");
  const [onlineUsers, setOnlineUsers] = useState(() => new Set());
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1 });
  const [, setClock] = useState(Date.now());
  const displayName = useMemo(
    () => user?.fullName || user?.username || "Bạn",
    [user],
  );
  const loadPosts = useCallback(
    async (requestedPage = page, showLoading = true) => {
      try {
        if (showLoading) setLoading(true);
        const response = await getCfsPosts({ page: requestedPage, limit: 100 });
        const receivedPosts = response.data?.data?.posts || [];
        setPosts((current) =>
          receivedPosts.map((post) => ({
            ...post,
            background:
              post.background ||
              current.find((item) => item._id === post._id)?.background ||
              "",
          })),
        );
        setPagination(response.data?.data?.pagination || { totalPages: 1 });
      } catch {
        message.error("Không thể tải bảng tin CFS");
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [page],
  );
  useEffect(() => {
    loadPosts(page);
  }, [page, loadPosts]);
  useEffect(
    () => onOnlineUsers(({ userIds }) => setOnlineUsers(new Set(userIds))),
    [],
  );
  const applyCfsRealtimeChange = useCallback(async ({ postId: changedPostId, action } = {}) => {
    if (!changedPostId) return loadPosts(page, false);
    if (action === "deleted") {
      setPosts((current) => current.filter((post) => String(post._id) !== String(changedPostId)));
      if (String(postId) === String(changedPostId)) navigate("/cfs", { replace: true });
      return;
    }
    try {
      const response = await getCfsPost(changedPostId);
      const changedPost = response.data?.data?.post;
      if (!changedPost) return;
      setPosts((current) => {
        const index = current.findIndex((post) => String(post._id) === String(changedPostId));
        if (index >= 0) return current.map((post) => String(post._id) === String(changedPostId) ? changedPost : post);
        return action === "created" && page === 1 ? [changedPost, ...current] : current;
      });
      if (String(postId) === String(changedPostId)) setDetailPost(changedPost);
    } catch {
      // Event có thể đến sau khi bài viết đã bị xóa; lần tải sau sẽ tự đồng bộ.
    }
  }, [loadPosts, navigate, page, postId]);
  useEffect(
    () =>
      onCfsChanged(applyCfsRealtimeChange),
    [applyCfsRealtimeChange],
  );
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    getCfsIdentity()
      .then((response) => setAlias(response.data?.data?.alias || ""))
      .catch(() => message.error("Không thể kiểm tra biệt danh CFS"));
  }, []);
  useEffect(() => {
    const receiveImage = (event) => {
      if (event.detail) setImageUrl(event.detail);
    };
    window.addEventListener("cfs:image-selected", receiveImage);
    return () => window.removeEventListener("cfs:image-selected", receiveImage);
  }, []);
  useEffect(() => {
    if (!postId) return setDetailPost(null);
    getCfsPost(postId)
      .then((response) => setDetailPost(response.data?.data?.post || null))
      .catch(() => {
        message.error("Không thể tải bài viết");
        navigate("/cfs", { replace: true });
      });
  }, [postId, navigate]);
  const requestAnonymous = (value, target) => {
    if (!value)
      return target === "post" ? setAnonymous(false) : setReplyAnonymous(false);
    if (alias)
      return target === "post" ? setAnonymous(true) : setReplyAnonymous(true);
    setAliasTarget(target);
    setAliasModalOpen(true);
  };
  useEffect(() => {
    const openComposer = (event) => {
      if (!event.target.closest(".cfs-composer")) return;
      event.preventDefault();
      event.stopPropagation();
      Modal.confirm({
        title: "Tạo bài viết",
        icon: null,
        className: "cfs-create-modal",
        width: 560,
        closable: true,
        maskClosable: true,
        footer: null,
        content: (
          <CreatePostForm
            displayName={displayName}
            initialAnonymous={anonymous}
            alias={alias}
            requestAnonymous={requestAnonymous}
            onSubmit={async (draft) => {
              try {
                const response = await createCfsPost(draft);
                const post = response.data?.data?.post;
                if (post) {
                  const nextPost = {
                    ...post,
                    background: post.background || draft.background,
                  };
                  setPosts((current) => [
                    nextPost,
                    ...current.filter((item) => item._id !== nextPost._id),
                  ]);
                } else {
                  await loadPosts(page, false);
                }
                message.success("Đã đăng bài");
              } catch (error) {
                message.error(
                  error.response?.data?.message || "Không thể đăng bài",
                );
                throw error;
              }
            }}
          />
        ),
      });
    };
    document.addEventListener("click", openComposer, true);
    return () => document.removeEventListener("click", openComposer, true);
  }, [alias, anonymous, displayName, loadPosts, page]);
  const saveAlias = async () => {
    if (!aliasDraft.trim()) return message.warning("Hãy chọn một biệt danh");
    try {
      setSavingAlias(true);
      const response = await setCfsIdentity(aliasDraft);
      setAlias(response.data?.data?.alias || aliasDraft.trim());
      if (aliasTarget === "post") setAnonymous(true);
      else setReplyAnonymous(true);
      setAliasModalOpen(false);
      setAliasDraft("");
    } catch (error) {
      message.error(error.response?.data?.message || "Không thể tạo biệt danh");
    } finally {
      setSavingAlias(false);
    }
  };
  const publish = async () => {
    if (submitting) return;
    if (!content.trim() && !imageUrl)
      return message.warning("Viết điều bạn muốn chia sẻ hoặc chọn ảnh");
    try {
      setSubmitting(true);
      const response = await createCfsPost({
        content,
        imageUrl,
        background,
        isAnonymous: anonymous,
      });
      const post = response.data?.data?.post;
      setContent("");
      setImageUrl("");
      setBackground("");
      setAnonymous(false);
      setComposerOpen(false);
      if (post)
        setPosts((current) => [
          post,
          ...current.filter((item) => item._id !== post._id),
        ]);
      message.success("Đã đăng bài");
    } catch (error) {
      message.error(error.response?.data?.message || "Không thể đăng bài");
    } finally {
      setSubmitting(false);
    }
  };
  const like = async (id) => {
    const previous = posts;
    const previousDetail = detailPost;
    const toggle = (post) =>
      post._id === id
        ? {
            ...post,
            liked: !post.liked,
            likes: post.likes + (post.liked ? -1 : 1),
          }
        : post;
    setPosts((current) => current.map(toggle));
    setDetailPost((current) => (current ? toggle(current) : current));
    try {
      await toggleCfsLike(id);
    } catch {
      setPosts(previous);
      setDetailPost(previousDetail);
      message.error("Không thể cập nhật lượt thích");
    }
  };
  const removePost = async (targetPostId) => {
    try {
      await deleteCfsPost(targetPostId);
      if (postId === targetPostId) navigate("/cfs");
      await loadPosts(page);
      message.success("Đã xóa bài viết");
    } catch (error) {
      message.error(error.response?.data?.message || "Không thể xóa bài viết");
    }
  };
  const removeReply = async (targetPostId, replyId) => {
    try {
      await deleteCfsReply(targetPostId, replyId);
      if (postId === targetPostId) {
        const response = await getCfsPost(targetPostId);
        setDetailPost(response.data?.data?.post || null);
      }
      await loadPosts(page);
    } catch (error) {
      message.error(error.response?.data?.message || "Không thể xóa phản hồi");
    }
  };
  const likeReply = async (postId, reply) => {
    const previousPosts = posts;
    const previousDetail = detailPost;
    const updateReply = (post, nextReply) =>
      post?._id === postId
        ? {
            ...post,
            replies: post.replies.map((item) =>
              item._id === reply._id ? { ...item, ...nextReply } : item,
            ),
          }
        : post;
    const optimisticReply = {
      liked: !reply.liked,
      likes: Math.max(0, reply.likes + (reply.liked ? -1 : 1)),
    };

    setPosts((current) =>
      current.map((post) => updateReply(post, optimisticReply)),
    );
    setDetailPost((current) => updateReply(current, optimisticReply));

    try {
      const response = await toggleCfsReplyLike(postId, reply._id);
      const serverReply = response.data?.data;
      if (!serverReply) return;
      setPosts((current) =>
        current.map((post) => updateReply(post, serverReply)),
      );
      setDetailPost((current) => updateReply(current, serverReply));
    } catch {
      setPosts(previousPosts);
      setDetailPost(previousDetail);
      message.error("Không thể cập nhật lượt thích");
    }
  };
  const sendReply = async () => {
    if (replySubmitting || !replyContent.trim() || !postId) return;
    try {
      setReplySubmitting(true);
      await createCfsReply(postId, {
        content: replyContent,
        isAnonymous: replyAnonymous,
        parentReplyId: replyingTo?.parentReplyId || null,
      });
      setReplyingTo(null);
      setReplyContent("");
      setReplyAnonymous(false);
      const response = await getCfsPost(postId);
      setDetailPost(response.data?.data?.post || null);
      await loadPosts(page);
    } catch (error) {
      message.error(error.response?.data?.message || "Không thể gửi phản hồi");
    } finally {
      setReplySubmitting(false);
    }
  };
  const setDetailPostId = (id) => navigate(`/cfs/${id}`);
  if (postId)
    return (
      <>
        <DetailPage
          post={detailPost}
          onClose={() => navigate("/cfs")}
          admin={user?.role === "admin"}
          onlineUsers={onlineUsers}
          viewer={user}
          onLike={like}
          onDeletePost={removePost}
          onDeleteReply={removeReply}
          onLikeReply={likeReply}
          replyingTo={replyingTo}
          setReplyingTo={setReplyingTo}
          replyContent={replyContent}
          setReplyContent={setReplyContent}
          replyAnonymous={replyAnonymous}
          setReplyAnonymous={setReplyAnonymous}
          alias={alias}
          requestAnonymous={requestAnonymous}
          onSendReply={sendReply}
          replySubmitting={replySubmitting}
          replySort={replySort}
          setReplySort={setReplySort}
        />
        <CfsActivityBell onOpenPost={setDetailPostId} />
      </>
    );
  return (
    <div className="cfs-page pb-24 lg:pb-0">
      <header className="cfs-hero">
        <div>
          <span>Cộng đồng nội bộ</span>
          <h1>Yakiuo CFS</h1>
        </div>
        <Button
          type="text"
          icon={<ReloadOutlined />}
          onClick={() => loadPosts(page)}
          loading={loading}
        >
          Làm mới
        </Button>
      </header>
      <div className="cfs-layout">
        <main className="cfs-feed">
          <section className="cfs-composer">
            <Avatar size={40} src={user?.avatar || undefined}>
              {displayName.slice(0, 1)}
            </Avatar>
            <div className="cfs-composer-main">
              <Input.TextArea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder={`${displayName} đang nghĩ gì?`}
                autoSize={{ minRows: 1, maxRows: 5 }}
                maxLength={2000}
              />
              <div className="cfs-composer-footer">
                <AnonymousToggle
                  enabled={anonymous}
                  alias={alias}
                  onChange={(value) => requestAnonymous(value, "post")}
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={publish}
                  loading={submitting}
                  disabled={!content.trim()}
                >
                  Đăng
                </Button>
              </div>
            </div>
          </section>
          {loading ? (
            <div className="cfs-loading">Đang tải bài viết...</div>
          ) : posts.length === 0 ? (
            <div className="cfs-empty">
              Chưa có bài viết nào. Hãy mở đầu cuộc trò chuyện nhé.
            </div>
          ) : (
            posts.map((post) => (
              <article className="cfs-post" key={post._id}>
                <div className="cfs-post-grid">
                  <CfsAvatar
                    author={post.author}
                    online={onlineUsers.has(String(post.author?.userId))}
                  />
                  <div className="cfs-post-body">
                    <PostHeader
                      author={post.author}
                      createdAt={post.createdAt}
                      admin={user?.role === "admin"}
                    />
                    <p>{post.content}</p>
                    <PostActions
                      post={post}
                      onLike={like}
                      onOpenReplies={() => {
                        setDetailPostId(post._id);
                        setReplyingTo(null);
                        setReplyContent("");
                      }}
                      showDelete={post.canManage}
                      onDelete={removePost}
                    />
                  </div>
                </div>
              </article>
            ))
          )}
          {pagination.totalPages > 1 && (
            <nav className="cfs-pagination">
              <Button disabled={page === 1} onClick={() => setPage(page - 1)}>
                Trang trước
              </Button>
              <span>
                Trang {page} / {pagination.totalPages}
              </span>
              <Button
                disabled={page === pagination.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Trang sau
              </Button>
            </nav>
          )}
        </main>
      </div>
      <CfsActivityBell onOpenPost={setDetailPostId} elevated />
      <DetailModal
        post={detailPost}
        open={Boolean(detailPost)}
        onClose={() => {
          setDetailPostId(null);
          setReplyingTo(null);
        }}
        admin={user?.role === "admin"}
        onlineUsers={onlineUsers}
        viewer={user}
        onLike={like}
        onDeletePost={removePost}
        onDeleteReply={removeReply}
        onLikeReply={likeReply}
        replyingTo={replyingTo}
        setReplyingTo={setReplyingTo}
        replyContent={replyContent}
        setReplyContent={setReplyContent}
        replyAnonymous={replyAnonymous}
        setReplyAnonymous={setReplyAnonymous}
        alias={alias}
        requestAnonymous={requestAnonymous}
        onSendReply={sendReply}
      />
      <Modal
        open={aliasModalOpen}
        title="Tạo biệt danh ẩn danh"
        onCancel={() => setAliasModalOpen(false)}
        footer={
          <Button type="primary" loading={savingAlias} onClick={saveAlias}>
            Xác nhận
          </Button>
        }
      >
        <p className="cfs-alias-note">
          Biệt danh chỉ dùng khi bạn chọn đăng ẩn danh.
        </p>
        <Input
          value={aliasDraft}
          onChange={(event) => setAliasDraft(event.target.value)}
          placeholder="Ví dụ: Mèo hay ngủ"
          maxLength={40}
          autoFocus
          onPressEnter={saveAlias}
        />
      </Modal>
    </div>
  );
};
export default Cfs;
