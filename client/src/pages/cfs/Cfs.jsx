import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Dropdown,
  Input,
  Modal,
  Popconfirm,
  Select,
  Slider,
  Switch,
  message,
} from "antd";
import {
  BellOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  HeartFilled,
  HeartOutlined,
  MessageOutlined,
  MoreOutlined,
  PictureOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  PushpinFilled,
  PushpinOutlined,
  ReloadOutlined,
  SendOutlined,
  SearchOutlined,
  SoundOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../../store/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import {
  createCfsPost,
  createCfsStory,
  deleteCfsStory,
  createCfsReply,
  deleteCfsActivityItem,
  deleteCfsPost,
  deleteCfsReply,
  getCfsActivity,
  getCfsIdentity,
  getAudiusTracks,
  getCfsPost,
  getCfsStories,
  getCfsPosts,
  markCfsActivityItemRead,
  resolveCfsMusicLink,
  setCfsIdentity,
  toggleCfsLike,
  toggleCfsPin,
  toggleCfsReplyLike,
  uploadCfsImage,
  updateCfsPost,
} from "../../services/cfs.service";
import { onCfsChanged, onCfsNotification, onOnlineUsers } from "../../services/socket";
import UserAvatar from "../../components/common/UserAvatar";
import { API_BASE_URL } from "../../services/api";
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
const optimizedCfsImage = (url, width) => {
  if (!/^https?:\/\/res\.cloudinary\.com\/.*\/image\/upload\//i.test(url || "")) return url;
  return url.replace("/image/upload/", `/image/upload/f_auto,q_auto,w_${width},c_limit/`);
};
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
const PostHeader = ({ author, createdAt, admin, post, onTogglePin, onDelete, onEdit }) => {
  const menuItems = [];
  if (post.canPin) menuItems.push({
    key: "pin",
    icon: post.isPinned ? <PushpinFilled /> : <PushpinOutlined />,
    label: post.isPinned ? "Bỏ ghim bài viết" : "Ghim bài viết",
    onClick: onTogglePin,
  });
  if (post.isOwner && onEdit) menuItems.push({ key: "edit", icon: <EditOutlined />, label: "Chỉnh sửa bài viết", onClick: () => onEdit(post) });
  if (post.canManage) menuItems.push({
    key: "delete",
    icon: <DeleteOutlined />,
    danger: true,
    label: "Xóa bài viết",
    onClick: () => Modal.confirm({ title: "Xóa bài viết này?", content: "Toàn bộ phản hồi cũng sẽ bị xóa.", okText: "Xóa", okButtonProps: { danger: true }, cancelText: "Hủy", onOk: () => onDelete(post._id) }),
  });
  const moreButton = <button type="button" className="cfs-more-action" aria-label="Tùy chọn bài viết"><MoreOutlined /></button>;
  return (
    <div className="cfs-post-header">
      <Author author={author} createdAt={createdAt} admin={admin} />
      {post.isPinned && <span className="cfs-pinned-label"><PushpinFilled /> Đã ghim</span>}
      {menuItems.length ? <Dropdown menu={{ items: menuItems }} trigger={["click"]} placement="bottomRight">{moreButton}</Dropdown> : moreButton}
    </div>
  );
};
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

const PostActions = ({ post, onLike, onOpenReplies, onShowLikes }) => {
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
          src={optimizedCfsImage(post.imageUrl, 1200)}
          alt="Ảnh bài viết"
          loading="lazy"
          decoding="async"
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
        </button>
        {post.likes > 0 && (
          <button
            type="button"
            className="cfs-like-summary"
            aria-label={`Xem ${post.likes} người đã thích`}
            onClick={() => onShowLikes(post)}
          >
            {post.likeUsers?.length > 0 && (
              <span
                className="cfs-like-avatars"
                title={post.likeUsers.map((user) => user.name).join(", ")}
              >
                {post.likeUsers.slice(0, 2).map((user) => (
                  <UserAvatar key={String(user._id)} size={18} user={user} openDetail={false}>
                    {user.name.slice(0, 1)}
                  </UserAvatar>
                ))}
                {post.likeUsers.length > 2 && <b>+{post.likeUsers.length - 2}</b>}
              </span>
            )}
          </button>
        )}
        <button
          type="button"
          aria-label="Xem bình luận"
          onClick={onOpenReplies}
        >
          <MessageOutlined />
          {post.replies?.length > 0 && <span>{post.replies.length}</span>}
        </button>
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

const CfsLikesModal = ({ post, onClose }) => (
  <Modal
    open={Boolean(post)}
    title="Những người đã thích"
    footer={null}
    onCancel={onClose}
    width={380}
  >
    <div className="cfs-likes-list">
      {(post?.likeUsers || []).map((user) => (
        <div className="cfs-likes-user" key={String(user._id)}>
          <UserAvatar size={36} user={user}>
            {user.name?.slice(0, 1)}
          </UserAvatar>
          <span>{user.name}</span>
        </div>
      ))}
    </div>
  </Modal>
);

const storyBackgrounds = ["#334155", "#7c3aed", "#be185d", "#0369a1", "#047857", "#b45309"];
const STORY_VIEW_DURATION = 25_000;
const formatAudioTime = (seconds = 0) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
const getStoryAuthorKey = (story) => String(story?.author?._id || story?.author?.name || "");

const StoryTray = ({ stories, user, onCreate, onOpen }) => (
  <section className="cfs-stories" aria-label="Story">
    <button type="button" className="cfs-story-card cfs-create-story" onClick={onCreate}>
      <UserAvatar size={48} user={user} openDetail={false}>{(user?.fullName || user?.username || "Bạn").slice(0, 1)}</UserAvatar>
      <span className="cfs-story-plus"><PlusOutlined /></span>
      <b>Tạo tin</b>
    </button>
    {stories.map((story) => (
      <button
        type="button"
        className="cfs-story-card"
        key={story._id}
        onClick={() => onOpen(story)}
        style={story.imageUrl ? undefined : { background: story.background }}
      >
        {story.imageUrl && <img className="cfs-story-card-image" src={optimizedCfsImage(story.imageUrl, 320)} alt="" loading="lazy" decoding="async" />}
        <UserAvatar size={38} user={story.author} className="cfs-story-avatar" openDetail={false}>
          {story.author.name?.slice(0, 1)}
        </UserAvatar>
        {story.content && <span className="cfs-story-card-content">{story.content}</span>}
        <b>{story.author.name}</b>
      </button>
    ))}
  </section>
);

const StoryCreator = ({ open, onClose, onCreated }) => {
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [background, setBackground] = useState(storyBackgrounds[0]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [musicQuery, setMusicQuery] = useState("");
  const [musicResults, setMusicResults] = useState([]);
  const [musicLoading, setMusicLoading] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState(null);
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [resolvingSpotify, setResolvingSpotify] = useState(false);
  const [musicPickerOpen, setMusicPickerOpen] = useState(false);
  const [musicSource, setMusicSource] = useState("audius");
  const selectImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const response = await uploadCfsImage(file);
      setImageUrl(response.data?.data?.url || "");
    } catch {
      message.error("Không thể tải ảnh lên");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };
  const searchMusic = async () => {
    if (musicQuery.trim().length < 2) return message.warning("Nhập ít nhất 2 ký tự để tìm nhạc");
    try {
      setMusicLoading(true);
      const response = await getAudiusTracks(musicQuery.trim());
      setMusicResults(response.data?.data?.tracks || []);
    } catch (error) {
      message.error(error.response?.data?.message || "Không thể tìm nhạc Audius");
    } finally {
      setMusicLoading(false);
    }
  };
  const addSpotifyLink = async () => {
    if (!spotifyUrl.trim()) return message.warning("Dán link Spotify, YouTube hoặc TikTok trước");
    try {
      setResolvingSpotify(true);
      const response = await resolveCfsMusicLink(spotifyUrl.trim());
      setSelectedMusic(response.data?.data?.music || null);
      setSpotifyUrl("");
      message.success("Đã thêm nhạc vào Story");
    } catch (error) {
      message.error(error.response?.data?.message || "Không thể đọc link nhạc");
    } finally {
      setResolvingSpotify(false);
    }
  };
  const submit = async () => {
    if (!content.trim() && !imageUrl && !selectedMusic) return message.warning("Hãy thêm ảnh, nội dung hoặc nhạc cho Story");
    try {
      setSaving(true);
      const response = await createCfsStory({ content, imageUrl, background, music: selectedMusic });
      onCreated(response.data?.data?.story);
      setContent("");
      setImageUrl("");
      setMusicQuery("");
      setMusicResults([]);
      setSelectedMusic(null);
      setSpotifyUrl("");
      setMusicPickerOpen(false);
      onClose();
      message.success("Story sẽ hiển thị trong 24 giờ");
    } catch (error) {
      message.error(error.response?.data?.message || "Không thể đăng Story");
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
    <Modal open={open} title="Tạo Story" onCancel={onClose} onOk={submit} okText="Đăng Story" confirmLoading={saving} destroyOnHidden className="cfs-story-creator-modal" styles={{ body: { maxHeight: "min(58dvh, 510px)", overflowY: "auto" } }}>
      <div className="cfs-story-creator">
        <div className="cfs-story-preview" style={imageUrl ? { backgroundImage: `linear-gradient(rgba(0,0,0,.18), rgba(0,0,0,.54)), url(${optimizedCfsImage(imageUrl, 720)})` } : { background }}>
          <span>{content || "Story của bạn"}</span>
          {selectedMusic && <small className="cfs-story-preview-music"><SoundOutlined /> {selectedMusic.title} · {selectedMusic.artist}</small>}
        </div>
        <Input.TextArea value={content} onChange={(event) => setContent(event.target.value)} placeholder="Bạn muốn chia sẻ điều gì?" maxLength={300} autoSize={{ minRows: 2, maxRows: 4 }} />
        <div className="cfs-story-tools">
          <label className="cfs-story-image-button"><PictureOutlined /> {uploading ? "Đang tải..." : "Chọn ảnh"}<input type="file" accept="image/*" onChange={selectImage} disabled={uploading} /></label>
          <span className="cfs-story-colors">{storyBackgrounds.map((color) => <button type="button" aria-label="Chọn nền Story" className={background === color && !imageUrl ? "is-selected" : ""} key={color} style={{ background: color }} onClick={() => setBackground(color)} />)}</span>
        </div>
        <button type="button" className={selectedMusic ? "cfs-story-music-summary has-music" : "cfs-story-music-summary"} onClick={() => setMusicPickerOpen(true)}>{selectedMusic?.artworkUrl ? <img src={selectedMusic.artworkUrl} alt="" /> : <SoundOutlined />}<span>{selectedMusic ? <><small>Nhạc trong Story</small><b>{selectedMusic.title} · {selectedMusic.artist}</b></> : <><b>Thêm nhạc</b><small>Audius, Spotify, YouTube hoặc TikTok</small></>}</span><em>{selectedMusic ? "Đổi" : "+"}</em></button>
      </div>
    </Modal>
    <Modal open={musicPickerOpen} footer={null} onCancel={() => setMusicPickerOpen(false)} title="Chọn nhạc" className="cfs-music-picker-modal" destroyOnHidden>
      <div className="cfs-story-music-picker">
        <div className="cfs-music-source-tabs"><button type="button" className={musicSource === "audius" ? "is-active" : ""} onClick={() => setMusicSource("audius")}>Audius</button><button type="button" className={musicSource === "spotify" ? "is-active" : ""} onClick={() => setMusicSource("spotify")}>Spotify</button><button type="button" className={musicSource === "youtube" ? "is-active" : ""} onClick={() => setMusicSource("youtube")}>YouTube</button><button type="button" className={musicSource === "tiktok" ? "is-active" : ""} onClick={() => setMusicSource("tiktok")}>TikTok</button></div>
        {musicSource === "audius" && <Input.Search value={musicQuery} onChange={(event) => setMusicQuery(event.target.value)} onSearch={searchMusic} enterButton={<SearchOutlined />} loading={musicLoading} placeholder="Tên bài hát hoặc ca sĩ" maxLength={100} />}
        {(musicSource === "spotify" || musicSource === "youtube" || musicSource === "tiktok") && <Input.Search value={spotifyUrl} onChange={(event) => setSpotifyUrl(event.target.value)} onSearch={addSpotifyLink} enterButton="Thêm" loading={resolvingSpotify} placeholder={musicSource === "youtube" ? "Dán link video YouTube" : musicSource === "tiktok" ? "Dán link video TikTok" : "Dán link bài hát Spotify"} />}
        {selectedMusic && <div className="cfs-story-selected-music"><span><SoundOutlined /> <b>{selectedMusic.title}</b><small>{selectedMusic.artist}</small></span><Button type="link" danger size="small" onClick={() => setSelectedMusic(null)}>Bỏ nhạc</Button></div>}
        {selectedMusic?.provider === "audius" && <div className="cfs-story-clip-picker"><b>Đoạn nhạc trong Story <small>(25 giây)</small></b><audio controls preload="metadata" src={`${API_BASE_URL}/cfs/audius/tracks/${encodeURIComponent(selectedMusic.trackId)}/stream`} /><Slider min={0} max={Math.max(0, (selectedMusic.duration || 0) - 25)} value={Math.min(selectedMusic.startAt || 0, Math.max(0, (selectedMusic.duration || 0) - 25))} onChange={(startAt) => setSelectedMusic((current) => ({ ...current, startAt }))} tooltip={{ formatter: (value) => `Bắt đầu ${formatAudioTime(value)}` }} /><small>Bắt đầu từ {formatAudioTime(selectedMusic.startAt || 0)} — kéo tới đoạn điệp khúc bạn muốn.</small></div>}
        {musicSource === "audius" && musicResults.length > 0 && <div className="cfs-story-music-results">{musicResults.map((track) => <button type="button" key={track.trackId} className={selectedMusic?.trackId === track.trackId ? "is-selected" : ""} onClick={() => setSelectedMusic({ ...track, provider: "audius", startAt: 0 })}>{track.artworkUrl ? <img src={track.artworkUrl} alt="" /> : <SoundOutlined />}<span><b>{track.title}</b><small>{track.artist}</small></span></button>)}</div>}
        {selectedMusic && <Button type="primary" block onClick={() => setMusicPickerOpen(false)}>Xong</Button>}
      </div>
    </Modal>
    </>
  );
};

const StoryViewer = ({ story, stories, onClose, onNavigate, onDelete, externalAudioRef }) => {
  const localAudioRef = useRef(null);
  const audioRef = externalAudioRef || localAudioRef;
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [spotifyEmbedOpen, setSpotifyEmbedOpen] = useState(false);
  const [storyMenuOpen, setStoryMenuOpen] = useState(false);
  const [storyProgress, setStoryProgress] = useState(0);
  const storyGroup = useMemo(() => stories.filter((item) => getStoryAuthorKey(item) === getStoryAuthorKey(story)), [stories, story]);
  const index = storyGroup.findIndex((item) => item._id === story?._id);
  const allStoriesIndex = stories.findIndex((item) => item._id === story?._id);
  const previousStory = index > 0 ? storyGroup[index - 1] : allStoriesIndex > 0 ? stories[allStoriesIndex - 1] : null;
  const nextStory = index >= 0 && index < storyGroup.length - 1 ? storyGroup[index + 1] : allStoriesIndex >= 0 && allStoriesIndex < stories.length - 1 ? stories[allStoriesIndex + 1] : null;
  useEffect(() => setStoryMenuOpen(false), [story?._id]);
  useEffect(() => {
    setMusicPlaying(false);
    const audio = audioRef.current;
    if (!audio || story?.music?.provider !== "audius" || !story.music.trackId) return undefined;
    const streamUrl = `${API_BASE_URL}/cfs/audius/tracks/${encodeURIComponent(story.music.trackId)}/stream`;
    const startAt = () => {
      audio.currentTime = Math.min(story.music.startAt || 0, Math.max(0, (audio.duration || 1) - 1));
      audio.play().then(() => setMusicPlaying(true)).catch(() => setMusicPlaying(false));
    };
    if (!audio.src || !audio.src.endsWith(`/cfs/audius/tracks/${encodeURIComponent(story.music.trackId)}/stream`)) {
      audio.src = streamUrl;
      audio.load();
    }
    if (audio.readyState >= 1) startAt();
    else audio.addEventListener("loadedmetadata", startAt, { once: true });
    return () => {
      audio.removeEventListener("loadedmetadata", startAt);
      audio.pause();
    };
  }, [story?._id, story?.music?.trackId, story?.music?.startAt, audioRef]);
  useEffect(() => setSpotifyEmbedOpen(false), [story?._id]);
  useEffect(() => {
    if (!story?._id) return undefined;
    let animationFrame;
    const startedAt = performance.now();
    setStoryProgress(0);
    const updateProgress = (now) => {
      const progress = Math.min((now - startedAt) / STORY_VIEW_DURATION, 1);
      setStoryProgress(progress);
      if (progress >= 1) {
        if (nextStory) onNavigate(nextStory);
        else onClose();
        return;
      }
      animationFrame = requestAnimationFrame(updateProgress);
    };
    animationFrame = requestAnimationFrame(updateProgress);
    return () => cancelAnimationFrame(animationFrame);
  }, [story?._id, nextStory, onClose, onNavigate]);
  const toggleMusic = async () => {
    if (["spotify", "youtube", "tiktok"].includes(story?.music?.provider)) {
      setSpotifyEmbedOpen((open) => !open);
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try { await audio.play(); } catch { message.warning("Trình duyệt chưa thể phát nhạc"); }
    } else {
      audio.pause();
    }
  };
  useEffect(() => {
    if (!story) return undefined;
    const handleEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [story, onClose]);
  return (
    <AnimatePresence>
    {story && <motion.div className="cfs-story-overlay" role="dialog" aria-modal="true" aria-label="Xem Story" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <motion.div className="cfs-story-shell" initial={{ opacity: 0, scale: 0.84, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.88, y: 12 }} transition={{ type: "spring", stiffness: 340, damping: 28 }}>
      <div className="cfs-story-full" style={story.imageUrl ? { backgroundImage: `linear-gradient(0deg, rgba(0,0,0,.72), rgba(0,0,0,.12)), url(${optimizedCfsImage(story.imageUrl, 1080)})` } : { background: story.background }}>
        <div className="cfs-story-progress" aria-label="Tiến trình Story">{storyGroup.map((item, itemIndex) => <span key={item._id}><i style={{ width: `${itemIndex < index ? 100 : itemIndex === index ? storyProgress * 100 : 0}%` }} /></span>)}</div>
        <button type="button" className="cfs-story-close" aria-label="Đóng Story" onClick={onClose}><CloseOutlined /></button>
        <button type="button" className="cfs-story-nav cfs-story-nav-prev" aria-label="Story trước" disabled={!previousStory} onClick={() => previousStory && onNavigate(previousStory)} />
        <button type="button" className="cfs-story-nav cfs-story-nav-next" aria-label="Story kế tiếp" disabled={!nextStory} onClick={() => nextStory && onNavigate(nextStory)} />
        <div className="cfs-story-full-author">
          <UserAvatar size={40} user={story.author}>{story.author.name?.slice(0, 1)}</UserAvatar>
          <span><b>{story.author.name}</b><small>{timeAgo(story.createdAt)}</small>{story.music?.trackId && <button type="button" className="cfs-story-inline-music" onClick={toggleMusic} title={musicPlaying ? "Tạm dừng nhạc" : "Phát nhạc"}><SoundOutlined /><em>{story.music.title} · {story.music.artist}</em>{musicPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}</button>}</span>
          {story.canManage && <span className="cfs-story-menu-wrap"><button type="button" className="cfs-story-more" aria-label="Tùy chọn Story" onClick={() => setStoryMenuOpen((open) => !open)}><MoreOutlined /></button>{storyMenuOpen && <button type="button" className="cfs-story-delete-menu" onClick={() => { if (window.confirm("Xóa Story này?")) onDelete(story._id); }}><DeleteOutlined /> Xóa Story</button>}</span>}
        </div>
        {story.content && <p>{story.content}</p>}
        {!story.content && !story.imageUrl && story.music?.trackId && <button type="button" className="cfs-story-music-card" onClick={toggleMusic}>{story.music.artworkUrl ? <img src={story.music.artworkUrl} alt="" /> : <span className="cfs-story-music-card-icon"><SoundOutlined /></span>}<span><small>{story.music.provider === "spotify" ? "Spotify" : story.music.provider === "youtube" ? "YouTube" : story.music.provider === "tiktok" ? "TikTok" : "Audius"}</small><b>{story.music.title}</b><em>{story.music.artist}</em></span>{["spotify", "youtube", "tiktok"].includes(story.music.provider) ? <PlayCircleOutlined /> : musicPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}</button>}
        {["spotify", "youtube", "tiktok"].includes(story.music?.provider) && spotifyEmbedOpen && <iframe className="cfs-story-spotify-embed" title={`${story.music.provider}: ${story.music.title}`} src={story.music.embedUrl} width="100%" height={story.music.provider === "spotify" ? "80" : story.music.provider === "youtube" ? "180" : "500"} frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" />}
        {!externalAudioRef && story.music?.provider === "audius" && story.music.trackId && <audio ref={localAudioRef} className="cfs-story-audio" preload="auto" onPlay={() => setMusicPlaying(true)} onPause={() => setMusicPlaying(false)} src={`${API_BASE_URL}/cfs/audius/tracks/${encodeURIComponent(story.music.trackId)}/stream`} />}
      </div>
      </motion.div>
    </motion.div>}
    </AnimatePresence>
  );
};

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
  onTogglePin,
  onShowLikes,
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
                    post={post}
                    onTogglePin={() => onTogglePin(post._id)}
                    onDelete={onDeletePost}
                  />
                  <p>{post.content}</p>
                  <PostActions
                    post={post}
                    onLike={onLike}
                    onShowLikes={onShowLikes}
                    onOpenReplies={() => {}}
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
  const [stories, setStories] = useState([]);
  const [storyCreatorOpen, setStoryCreatorOpen] = useState(false);
  const [activeStory, setActiveStory] = useState(null);
  const storyAudioRef = useRef(null);
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
  const [likesPost, setLikesPost] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [editingPostSaving, setEditingPostSaving] = useState(false);
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
  const openStory = useCallback((story) => {
    if (story?.music?.provider === "audius" && story.music.trackId) {
      const audio = storyAudioRef.current || new Audio();
      const streamUrl = `${API_BASE_URL}/cfs/audius/tracks/${encodeURIComponent(story.music.trackId)}/stream`;
      audio.pause();
      audio.src = streamUrl;
      audio.preload = "auto";
      audio.addEventListener("loadedmetadata", () => {
        audio.currentTime = Math.min(story.music.startAt || 0, Math.max(0, (audio.duration || 1) - 1));
      }, { once: true });
      // Gọi play ngay trong event click để trình duyệt nhận đây là thao tác của người dùng.
      audio.play().catch(() => {});
      storyAudioRef.current = audio;
    }
    setActiveStory(story);
  }, []);
  const closeStory = useCallback(() => {
    storyAudioRef.current?.pause();
    setActiveStory(null);
  }, []);
  useEffect(() => () => storyAudioRef.current?.pause(), []);
  const loadStories = useCallback(async () => {
    try {
      const response = await getCfsStories();
      setStories(response.data?.data?.stories || []);
    } catch {
      // Story không làm gián đoạn việc đọc bảng tin khi tải thất bại.
    }
  }, []);
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
  useEffect(() => {
    loadStories();
  }, [loadStories]);
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
        if (index >= 0) return current
          .map((post) => String(post._id) === String(changedPostId) ? changedPost : post)
          .sort((left, right) => {
            if (Boolean(left.isPinned) !== Boolean(right.isPinned)) return left.isPinned ? -1 : 1;
            return new Date(right.isPinned ? right.pinnedAt : right.createdAt) - new Date(left.isPinned ? left.pinnedAt : left.createdAt);
          });
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
  const togglePin = async (id) => {
    try {
      const response = await toggleCfsPin(id);
      const updatedPost = response.data?.data?.post;
      if (!updatedPost) return;
      const applyUpdatedPost = (current) =>
        current
          .map((post) => (post._id === id ? updatedPost : post))
          .sort((left, right) => {
            if (Boolean(left.isPinned) !== Boolean(right.isPinned)) return left.isPinned ? -1 : 1;
            return new Date(right.isPinned ? right.pinnedAt : right.createdAt) - new Date(left.isPinned ? left.pinnedAt : left.createdAt);
          });
      setPosts(applyUpdatedPost);
      setDetailPost((current) => (current?._id === id ? updatedPost : current));
      message.success(updatedPost.isPinned ? "Đã ghim bài viết" : "Đã bỏ ghim bài viết");
    } catch (error) {
      message.error(error.response?.data?.message || "Không thể cập nhật trạng thái ghim");
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
  const savePostEdit = async () => {
    if (!editingPost) return;
    if (!editingPost.content?.trim() && !editingPost.imageUrl) return message.warning("Bài viết cần có nội dung hoặc ảnh");
    try {
      setEditingPostSaving(true);
      const response = await updateCfsPost(editingPost._id, { content: editingPost.content, imageUrl: editingPost.imageUrl, background: editingPost.background });
      const updatedPost = response.data?.data?.post;
      if (updatedPost) {
        setPosts((current) => current.map((post) => post._id === updatedPost._id ? updatedPost : post));
        setDetailPost((current) => current?._id === updatedPost._id ? updatedPost : current);
      }
      setEditingPost(null);
      message.success("Đã chỉnh sửa bài viết");
    } catch (error) {
      message.error(error.response?.data?.message || "Không thể chỉnh sửa bài viết");
    } finally {
      setEditingPostSaving(false);
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
          onTogglePin={togglePin}
          onShowLikes={setLikesPost}
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
        <CfsLikesModal post={likesPost} onClose={() => setLikesPost(null)} />
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
          <StoryTray stories={stories} user={user} onCreate={() => setStoryCreatorOpen(true)} onOpen={openStory} />
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
                    post={post}
                    onTogglePin={() => togglePin(post._id)}
                    onDelete={removePost}
                    onEdit={setEditingPost}
                    />
                    <p>{post.content}</p>
                    <PostActions
                      post={post}
                      onLike={like}
                      onShowLikes={setLikesPost}
                      onOpenReplies={() => {
                        setDetailPostId(post._id);
                        setReplyingTo(null);
                        setReplyContent("");
                      }}
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
      <Modal open={Boolean(editingPost)} title="Chỉnh sửa bài viết" okText="Lưu thay đổi" cancelText="Hủy" onCancel={() => setEditingPost(null)} onOk={savePostEdit} confirmLoading={editingPostSaving} destroyOnHidden>
        <Input.TextArea value={editingPost?.content || ""} onChange={(event) => setEditingPost((current) => ({ ...current, content: event.target.value }))} placeholder="Bạn muốn chia sẻ điều gì?" maxLength={2000} autoSize={{ minRows: 4, maxRows: 8 }} />
      </Modal>
      <StoryCreator
        open={storyCreatorOpen}
        onClose={() => setStoryCreatorOpen(false)}
        onCreated={(story) => story && setStories((current) => [story, ...current])}
      />
      <StoryViewer
        story={activeStory}
        stories={stories}
        onClose={closeStory}
        onNavigate={setActiveStory}
        externalAudioRef={storyAudioRef}
        onDelete={async (storyId) => {
          try {
            await deleteCfsStory(storyId);
            setStories((current) => current.filter((story) => story._id !== storyId));
            closeStory();
            message.success("Đã xóa Story");
          } catch (error) {
            message.error(error.response?.data?.message || "Không thể xóa Story");
          }
        }}
      />
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
        onTogglePin={togglePin}
        onShowLikes={setLikesPost}
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
      <CfsLikesModal post={likesPost} onClose={() => setLikesPost(null)} />
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
