import { useCallback, useEffect, useMemo, useState } from "react";
import { Avatar, Button, Input, Modal, Popconfirm, Select, Switch, message } from "antd";
import { DeleteOutlined, HeartFilled, HeartOutlined, MessageOutlined, ReloadOutlined, SendOutlined, UserOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuth } from "../../store/AuthContext";
import { createCfsPost, createCfsReply, deleteCfsPost, deleteCfsReply, getCfsIdentity, getCfsPosts, setCfsIdentity, toggleCfsLike, toggleCfsReplyLike } from "../../services/cfs.service";
import { onCfsChanged, onOnlineUsers } from "../../services/socket";
import "./Cfs.css";

const CfsAvatar = ({ author, size = 44, isOnline = false }) => <span className="cfs-avatar-wrap"><Avatar size={size} src={author?.avatar || undefined} className={author?.anonymous ? "cfs-avatar cfs-avatar-anonymous" : "cfs-avatar"}>{author?.anonymous ? "?" : <UserOutlined />}</Avatar>{isOnline && <i className="cfs-online-dot" aria-label="Đang online" />}</span>;

const formatPostTime = (value) => {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ`;
  return dayjs(value).format("DD/MM/YYYY");
};

const Author = ({ author, createdAt, admin, isPostAuthor = false }) => (
  <div className="cfs-author">
    <span>{author?.name}</span>
    {author?.anonymous && <em>ẩn danh</em>}
    {admin && author?.identity && <small>Admin: {author.identity.fullName} · @{author.identity.username}</small>}
    <time>{formatPostTime(createdAt)}</time>
    {isPostAuthor && <b className="cfs-post-author-tag">Tác giả</b>}
  </div>
);

const AliasControl = ({ anonymous, setAnonymous, alias, compact = false }) => (
  <div className={`cfs-anon-control ${compact ? "is-compact" : ""}`}>
    <div><span>Đăng ẩn danh</span><Switch size="small" checked={anonymous} onChange={setAnonymous} /></div>
    {anonymous && <small>Dùng biệt danh: <strong>{alias}</strong></small>}
  </div>
);

const ReplyTree = ({ replies, parentReplyId = null, admin, onReply, onDelete, onLike, onlineUsers, expandedReplies, onToggleReplies, sortMode, depth = 0 }) => [...replies]
  .filter((reply) => String(reply.parentReplyId || "") === String(parentReplyId || ""))
  .sort((left, right) => sortMode === "likes" ? (right.likes - left.likes) || (new Date(right.createdAt) - new Date(left.createdAt)) : new Date(right.createdAt) - new Date(left.createdAt))
  .map((reply) => {
    const childReplies = replies.filter((item) => String(item.parentReplyId || "") === String(reply._id));
    const expanded = expandedReplies.has(String(reply._id));
    return <div className="cfs-reply-branch" key={reply._id} style={{ "--reply-depth": Math.min(depth, 3) }}>
      <div className="cfs-reply"><CfsAvatar author={reply.author} size={32} isOnline={onlineUsers.has(String(reply.author?.userId))} /><div className={`cfs-reply-content ${childReplies.length ? "has-children" : ""}`} onClick={() => childReplies.length && onToggleReplies(reply._id)}><Author author={reply.author} createdAt={reply.createdAt} admin={admin} isPostAuthor={reply.isPostAuthor} /><p>{reply.content}</p>{childReplies.length > 0 && <span className="cfs-expand-replies">{expanded ? "Thu gọn" : `Xem ${childReplies.length} phản hồi`}</span>}<div className="cfs-reply-actions"><button type="button" aria-label="Thích bình luận" className={reply.liked ? "is-liked" : ""} onClick={(event) => { event.stopPropagation(); onLike(reply); }}>{reply.liked ? <HeartFilled /> : <HeartOutlined />}{reply.likes > 0 && <span>{reply.likes}</span>}</button><button type="button" className="cfs-reply-action" onClick={(event) => { event.stopPropagation(); onReply(reply); }}>Trả lời</button>{reply.canManage && <Popconfirm title="Xóa bình luận này?" description="Các phản hồi bên dưới cũng sẽ bị xóa." okText="Xóa" cancelText="Hủy" onConfirm={() => onDelete(reply._id)}><button type="button" className="cfs-delete-action" onClick={(event) => event.stopPropagation()} aria-label="Xóa bình luận"><DeleteOutlined /></button></Popconfirm>}</div></div></div>
      {expanded && <ReplyTree replies={replies} parentReplyId={reply._id} admin={admin} onReply={onReply} onDelete={onDelete} onLike={onLike} onlineUsers={onlineUsers} expandedReplies={expandedReplies} onToggleReplies={onToggleReplies} sortMode={sortMode} depth={depth + 1} />}
    </div>;
  });

const Cfs = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [alias, setAlias] = useState("");
  const [aliasDraft, setAliasDraft] = useState("");
  const [identityLoading, setIdentityLoading] = useState(true);
  const [savingAlias, setSavingAlias] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState("");
  const [replyAnonymous, setReplyAnonymous] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(() => new Set());
  const [expandedReplies, setExpandedReplies] = useState(() => new Set());
  const [replySorts, setReplySorts] = useState({});
  const [, setClock] = useState(Date.now());

  const loadPosts = useCallback(async () => {
    try { setLoading(true); const response = await getCfsPosts(); setPosts(response.data?.data?.posts || []); }
    catch { message.error("Không thể tải bảng tin CFS"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadPosts(); }, [loadPosts]);
  useEffect(() => {
    const unsubscribe = onOnlineUsers(({ userIds }) => setOnlineUsers(new Set(userIds)));
    return unsubscribe;
  }, []);
  useEffect(() => {
    const refresh = () => loadPosts();
    return onCfsChanged(refresh);
  }, [loadPosts]);
  useEffect(() => {
    const interval = window.setInterval(() => setClock(Date.now()), 60000);
    return () => window.clearInterval(interval);
  }, []);
  useEffect(() => {
    const loadIdentity = async () => {
      try { const response = await getCfsIdentity(); setAlias(response.data?.data?.alias || ""); }
      catch { message.error("Không thể kiểm tra biệt danh CFS"); }
      finally { setIdentityLoading(false); }
    };
    loadIdentity();
  }, []);

  const saveAlias = async () => {
    if (!aliasDraft.trim()) return message.warning("Hãy chọn một biệt danh");
    try { setSavingAlias(true); const response = await setCfsIdentity(aliasDraft); setAlias(response.data?.data?.alias || aliasDraft.trim()); message.success("Đã tạo biệt danh ẩn danh"); }
    catch (error) { message.error(error.response?.data?.message || "Không thể tạo biệt danh"); }
    finally { setSavingAlias(false); }
  };

  const publish = async () => {
    if (!content.trim()) return message.warning("Viết điều bạn muốn chia sẻ trước nhé");
    if (anonymous && !alias) return message.warning("Bạn cần tạo biệt danh ẩn danh trước");
    try {
      setSubmitting(true); const response = await createCfsPost({ content, isAnonymous: anonymous });
      setPosts((current) => [response.data?.data?.post, ...current]); setContent(""); message.success("Đã đăng lên CFS");
    } catch (error) { message.error(error.response?.data?.message || "Không thể đăng bài"); }
    finally { setSubmitting(false); }
  };
  const like = async (id) => {
    const previous = posts;
    setPosts((current) => current.map((post) => post._id === id ? { ...post, liked: !post.liked, likes: post.likes + (post.liked ? -1 : 1) } : post));
    try { await toggleCfsLike(id); } catch { setPosts(previous); message.error("Không thể cập nhật lượt thích"); }
  };
  const removePost = async (postId) => {
    try { await deleteCfsPost(postId); setPosts((current) => current.filter((post) => post._id !== postId)); message.success("Đã xóa status"); }
    catch (error) { message.error(error.response?.data?.message || "Không thể xóa status"); }
  };
  const removeReply = async (postId, replyId) => {
    try { const response = await deleteCfsReply(postId, replyId); setPosts((current) => current.map((post) => post._id === postId ? response.data?.data?.post || post : post)); await loadPosts(); message.success("Đã xóa bình luận"); }
    catch (error) { message.error(error.response?.data?.message || "Không thể xóa bình luận"); }
  };
  const likeReply = async (postId, reply) => {
    const previous = posts;
    setPosts((current) => current.map((post) => post._id === postId ? { ...post, replies: post.replies.map((item) => item._id === reply._id ? { ...item, liked: !item.liked, likes: item.likes + (item.liked ? -1 : 1) } : item) } : post));
    try { await toggleCfsReplyLike(postId, reply._id); } catch { setPosts(previous); message.error("Không thể cập nhật lượt thích"); }
  };
  const reply = async () => {
    if (!replyContent.trim()) return;
    if (replyAnonymous && !alias) return message.warning("Bạn cần tạo biệt danh ẩn danh trước");
    try {
      const response = await createCfsReply(replyingTo.postId, { content: replyContent, isAnonymous: replyAnonymous, parentReplyId: replyingTo.parentReplyId });
      setPosts((current) => current.map((post) => post._id === replyingTo.postId ? response.data?.data?.post : post));
      if (replyingTo.parentReplyId) setExpandedReplies((current) => new Set(current).add(String(replyingTo.parentReplyId)));
      setReplyingTo(null); setReplyContent(""); message.success("Đã gửi phản hồi");
    } catch (error) { message.error(error.response?.data?.message || "Không thể gửi phản hồi"); }
  };
  const displayName = useMemo(() => user?.fullName || user?.username || "Bạn", [user]);
  return <div className="cfs-page pb-24 lg:pb-0">
    <header className="cfs-hero"><div><span>Cộng đồng nội bộ</span><h1>Yakiuo CFS</h1><p>Nói điều bạn nghĩ, bằng tên thật hoặc một biệt danh an toàn.</p></div><Button icon={<ReloadOutlined />} onClick={loadPosts} loading={loading}>Làm mới</Button></header>
    <div className="cfs-layout"><main className="cfs-feed">
      <section className="cfs-composer"><div className="cfs-composer-head"><Avatar size={44} src={user?.avatar || undefined}>{displayName.slice(0, 1)}</Avatar><div><strong>{displayName}</strong><span>Chia sẻ cùng Yakiuo</span></div></div>
        <Input.TextArea value={content} onChange={(event) => setContent(event.target.value)} placeholder="Hôm nay bạn đang nghĩ gì?" autoSize={{ minRows: 3, maxRows: 8 }} maxLength={2000} showCount />
        <div className="cfs-composer-footer"><AliasControl anonymous={anonymous} setAnonymous={setAnonymous} alias={alias} /><Button type="primary" icon={<SendOutlined />} onClick={publish} loading={submitting}>Đăng bài</Button></div>
      </section>
      {loading ? <div className="cfs-loading">Đang tải bài viết...</div> : posts.length === 0 ? <div className="cfs-empty">Chưa có lời tâm sự nào. Hãy mở đầu câu chuyện nhé.</div> : posts.map((post) => <article className="cfs-post" key={post._id}>
        <div className="cfs-post-grid"><CfsAvatar author={post.author} isOnline={onlineUsers.has(String(post.author?.userId))} /><div className="cfs-post-body"><Author author={post.author} createdAt={post.createdAt} admin={user?.role === "admin"} /><p>{post.content}</p>
          <div className="cfs-actions"><button aria-label="Thích bài viết" className={post.liked ? "is-liked" : ""} onClick={() => like(post._id)}>{post.liked ? <HeartFilled /> : <HeartOutlined />} {post.likes > 0 && <span>{post.likes}</span>}</button><button aria-label="Trả lời bài viết" onClick={() => setReplyingTo(replyingTo?.postId === post._id && !replyingTo?.parentReplyId ? null : { postId: post._id, parentReplyId: null, name: post.author.name })}><MessageOutlined /> {post.replies?.length > 0 && <span>{post.replies.length}</span>}</button>{post.canManage && <Popconfirm title="Xóa status này?" description="Toàn bộ bình luận của status cũng sẽ bị xóa." okText="Xóa" cancelText="Hủy" onConfirm={() => removePost(post._id)}><button className="cfs-delete-action" aria-label="Xóa status"><DeleteOutlined /></button></Popconfirm>}</div>
          {post.replies?.length > 0 && <div className="cfs-replies"><div className="cfs-reply-filter"><span>Bình luận</span><Select size="small" value={replySorts[post._id] || "top"} onChange={(value) => setReplySorts((current) => ({ ...current, [post._id]: value }))} options={[{ value: "top", label: "Hàng đầu" }, { value: "likes", label: "Nhiều tim nhất" }]} /></div><ReplyTree replies={post.replies} admin={user?.role === "admin"} onlineUsers={onlineUsers} expandedReplies={expandedReplies} onToggleReplies={(id) => setExpandedReplies((current) => { const next = new Set(current); const key = String(id); next.has(key) ? next.delete(key) : next.add(key); return next; })} onReply={(item) => setReplyingTo({ postId: post._id, parentReplyId: item._id, name: item.author.name })} onDelete={(replyId) => removeReply(post._id, replyId)} onLike={(reply) => likeReply(post._id, reply)} sortMode={replySorts[post._id] || "top"} /></div>}
          {replyingTo?.postId === post._id && <div className="cfs-reply-box"><div className="cfs-replying-label">Trả lời <strong>{replyingTo.name}</strong><button type="button" onClick={() => setReplyingTo(null)}>×</button></div><Input.TextArea value={replyContent} onChange={(event) => setReplyContent(event.target.value)} placeholder={`Trả lời ${replyingTo.name}...`} autoSize={{ minRows: 2, maxRows: 5 }} maxLength={1000}/><AliasControl compact anonymous={replyAnonymous} setAnonymous={setReplyAnonymous} alias={alias}/><Button type="primary" size="small" onClick={reply}>Gửi</Button></div>}
        </div></div>
      </article>)}
    </main><aside className="cfs-aside"><div><span className="cfs-aside-icon">✦</span><h3>Góc tâm sự Yakiuo</h3><p>Bạn có thể dùng biệt danh riêng. Danh tính thật chỉ hiển thị cho admin để đảm bảo cộng đồng luôn văn minh.</p></div><div className="cfs-rules"><strong>Giữ CFS dễ chịu</strong><span>Tôn trọng nhau</span><span>Không chia sẻ thông tin nhạy cảm</span><span>Góp ý thẳng thắn, tử tế</span></div></aside></div>
    <Modal open={!identityLoading && !alias} title="Tạo biệt danh ẩn danh" closable={false} maskClosable={false} footer={<Button type="primary" loading={savingAlias} onClick={saveAlias}>Xác nhận biệt danh</Button>}>
      <p className="cfs-alias-note">Biệt danh này chỉ tạo một lần và sẽ được dùng cho mọi bài viết hoặc phản hồi ẩn danh của bạn.</p>
      <Input value={aliasDraft} onChange={(event) => setAliasDraft(event.target.value)} placeholder="Ví dụ: Mèo hay ngủ" maxLength={40} autoFocus onPressEnter={saveAlias} />
    </Modal></div>;
};
export default Cfs;
