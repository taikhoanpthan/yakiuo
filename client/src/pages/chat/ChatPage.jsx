import { useEffect, useMemo, useRef, useState } from "react";

import {
  Avatar,
  Button,
  Empty,
  Input,
  Spin,
  Tooltip,
  message as antMessage,
} from "antd";

import {
  ArrowLeftOutlined,
  AudioOutlined,
  CheckOutlined,
  FileImageOutlined,
  HeartOutlined,
  InfoCircleOutlined,
  PhoneOutlined,
  SearchOutlined,
  SmileOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";

import { connectSocket, getSocket } from "../../services/socket";

import api from "../../services/api";

// =====================================================
// HELPERS
// =====================================================

const getCurrentUser = () => {
  try {
    const user =
      localStorage.getItem("user") || localStorage.getItem("currentUser");

    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
};

const getUserId = (user) => {
  if (!user) return null;

  return user._id || user.id;
};

const formatTime = (date) => {
  if (!date) return "";

  return new Date(date).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatConversationTime = (date) => {
  if (!date) return "";

  const messageDate = new Date(date);
  const now = new Date();

  if (messageDate.toDateString() === now.toDateString()) {
    return formatTime(date);
  }

  return messageDate.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });
};

// =====================================================
// COMPONENT
// =====================================================

export default function ChatPage() {
  // ===================================================
  // USER
  // ===================================================

  const currentUser = getCurrentUser();

  const currentUserId = getUserId(currentUser);

  // ===================================================
  // STATE
  // ===================================================

  const [conversations, setConversations] = useState([]);

  const [selectedConversationId, setSelectedConversationId] = useState(null);

  const [messages, setMessages] = useState([]);

  const [loadingConversations, setLoadingConversations] = useState(true);

  const [loadingMessages, setLoadingMessages] = useState(false);

  const [search, setSearch] = useState("");

  const [input, setInput] = useState("");

  const [mobileChat, setMobileChat] = useState(false);

  const [socketConnected, setSocketConnected] = useState(false);

  // ===================================================
  // REFS
  // ===================================================

  const messagesEndRef = useRef(null);

  const currentConversationRef = useRef(null);

  const previousConversationRef = useRef(null);

  // ===================================================
  // CURRENT CONVERSATION REF
  // ===================================================

  useEffect(() => {
    currentConversationRef.current = selectedConversationId;
  }, [selectedConversationId]);

  // ===================================================
  // OTHER USER
  // ===================================================

  const getOtherParticipant = (conversation) => {
    if (!conversation?.participants) {
      return null;
    }

    return conversation.participants.find(
      (user) => String(user._id) !== String(currentUserId),
    );
  };

  // ===================================================
  // LOAD CONVERSATIONS
  // ===================================================

  const loadConversations = async () => {
    try {
      setLoadingConversations(true);

      const response = await api.get("/conversations");

      const data = response?.data?.data || [];

      setConversations(data);

      if (data.length > 0 && !selectedConversationId) {
        setSelectedConversationId(data[0]._id);
      }
    } catch (error) {
      console.error("Load conversations error:", error);

      antMessage.error(
        error?.response?.data?.message || "Không thể tải cuộc trò chuyện",
      );
    } finally {
      setLoadingConversations(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  // ===================================================
  // SELECTED CONVERSATION
  // ===================================================

  const selectedConversation = useMemo(() => {
    return conversations.find(
      (conversation) =>
        String(conversation._id) === String(selectedConversationId),
    );
  }, [conversations, selectedConversationId]);

  const otherUser = getOtherParticipant(selectedConversation);

  // ===================================================
  // LOAD MESSAGES
  // ===================================================

  const loadMessages = async (conversationId) => {
    if (!conversationId) return;

    try {
      setLoadingMessages(true);

      const response = await api.get(`/messages/${conversationId}`, {
        params: {
          page: 1,
          limit: 100,
        },
      });

      const data = response?.data?.data || [];

      setMessages(data);
    } catch (error) {
      console.error("Load messages error:", error);

      antMessage.error(
        error?.response?.data?.message || "Không thể tải tin nhắn",
      );

      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  // ===================================================
  // LOAD WHEN CHANGE CONVERSATION
  // ===================================================

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }

    loadMessages(selectedConversationId);
  }, [selectedConversationId]);

  // ===================================================
  // SOCKET
  // ===================================================

  useEffect(() => {
    const socket = connectSocket();

    if (!socket) return;

    const handleConnect = () => {
      console.log("🟢 Chat socket connected:", socket.id);

      setSocketConnected(true);

      const conversationId = currentConversationRef.current;

      if (conversationId) {
        socket.emit("conversation:join", {
          conversationId,
        });
      }
    };

    const handleDisconnect = (reason) => {
      console.log("🔴 Chat socket disconnected:", reason);

      setSocketConnected(false);
    };

    const handleNewMessage = (newMessage) => {
      console.log("📩 New message:", newMessage);

      const conversationId = newMessage?.conversationId;

      if (!conversationId) return;

      // =============================================
      // UPDATE SIDEBAR
      // =============================================

      setConversations((prev) => {
        const index = prev.findIndex(
          (conversation) => String(conversation._id) === String(conversationId),
        );

        if (index === -1) {
          return prev;
        }

        const updatedConversation = {
          ...prev[index],

          lastMessage: newMessage,

          lastMessageAt: newMessage.createdAt,
        };

        const next = [
          updatedConversation,
          ...prev.filter((_, i) => i !== index),
        ];

        return next;
      });

      // =============================================
      // KHÔNG PHẢI CHAT HIỆN TẠI
      // =============================================

      if (String(conversationId) !== String(currentConversationRef.current)) {
        return;
      }

      // =============================================
      // ADD MESSAGE
      // =============================================

      setMessages((prev) => {
        if (
          newMessage?._id &&
          prev.some((item) => String(item._id) === String(newMessage._id))
        ) {
          return prev;
        }

        if (
          newMessage?.clientMessageId &&
          prev.some(
            (item) => item.clientMessageId === newMessage.clientMessageId,
          )
        ) {
          return prev;
        }

        return [...prev, newMessage];
      });
    };

    const handleMessageError = (error) => {
      console.error("❌ message:error", error);

      antMessage.error(error?.message || "Không thể gửi tin nhắn");
    };

    const handleChatError = (error) => {
      console.error("❌ chat:error", error);

      antMessage.error(error?.message || "Lỗi chat");
    };

    socket.on("connect", handleConnect);

    socket.on("disconnect", handleDisconnect);

    socket.on("message:new", handleNewMessage);

    socket.on("message:error", handleMessageError);

    socket.on("chat:error", handleChatError);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);

      socket.off("disconnect", handleDisconnect);

      socket.off("message:new", handleNewMessage);

      socket.off("message:error", handleMessageError);

      socket.off("chat:error", handleChatError);
    };
  }, []);

  // ===================================================
  // JOIN / LEAVE ROOM
  // ===================================================

  useEffect(() => {
    const socket = getSocket();

    if (!socket || !selectedConversationId) {
      return;
    }

    const previousConversation = previousConversationRef.current;

    if (
      previousConversation &&
      String(previousConversation) !== String(selectedConversationId)
    ) {
      socket.emit("conversation:leave", {
        conversationId: previousConversation,
      });
    }

    if (socket.connected) {
      socket.emit("conversation:join", {
        conversationId: selectedConversationId,
      });
    }

    previousConversationRef.current = selectedConversationId;
  }, [selectedConversationId]);

  // ===================================================
  // AUTO SCROLL
  // ===================================================

  useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }, 80);

    return () => clearTimeout(timer);
  }, [messages]);

  // ===================================================
  // SEARCH
  // ===================================================

  const filteredConversations = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return conversations;
    }

    return conversations.filter((conversation) => {
      const user = getOtherParticipant(conversation);

      if (!user) return false;

      return (
        user.username?.toLowerCase().includes(keyword) ||
        user.email?.toLowerCase().includes(keyword)
      );
    });
  }, [conversations, search, currentUserId]);

  // ===================================================
  // SELECT
  // ===================================================
  const handleSelectConversation = (conversationId) => {
    if (String(conversationId) === String(selectedConversationId)) {
      setMobileChat(true);
      return;
    }

    setSelectedConversationId(conversationId);
    setInput("");
    setMobileChat(true);
  };

  // ===================================================
  // SEND
  // ===================================================

  const handleSendMessage = () => {
    const content = input.trim();

    if (!content) return;

    if (!selectedConversationId) {
      antMessage.warning("Vui lòng chọn cuộc trò chuyện");
      return;
    }

    const socket = getSocket();

    if (!socket || !socket.connected) {
      antMessage.error("Socket chưa kết nối");
      return;
    }

    if (!currentUserId) {
      antMessage.error("Không xác định được người dùng");
      return;
    }

    const clientMessageId = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;

    socket.emit("message:send", {
      conversationId: selectedConversationId,

      senderId: currentUserId,

      content,

      clientMessageId,
    });

    setInput("");
  };

  // ===================================================
  // ENTER
  // ===================================================

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      handleSendMessage();
    }
  };

  // ===================================================
  // BACK
  // ===================================================

  const handleBack = () => {
    const socket = getSocket();

    if (socket && selectedConversationId) {
      socket.emit("conversation:leave", {
        conversationId: selectedConversationId,
      });
    }

    setMobileChat(false);
  };

  // ===================================================
  // LOADING
  // ===================================================

  if (loadingConversations) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-white">
        <Spin size="large" />
      </div>
    );
  }

  // ===================================================
  // UI — Instagram-style Direct Messages
  // ===================================================

  return (
    /*
      QUAN TRỌNG:

      Không dùng:
      h-[calc(100vh-64px)]

      Vì Layout của bạn đã xử lý chiều cao/header.

      flex-1 + min-h-0 giúp ChatPage nằm
      đúng phần content bên dưới Header.
    */

    <div className="flex h-full min-h-0 min-w-0 w-full overflow-hidden bg-white">
      <div className="flex h-full min-h-0 min-w-0 w-full overflow-hidden bg-white lg:border lg:border-gray-200">
        {/* ================================================= */}
        {/* SIDEBAR */}
        {/* ================================================= */}

        <aside
          className={`
            flex
            min-h-0
            w-full
            shrink-0
            flex-col
            border-r
            border-gray-200
            bg-white
            lg:w-[397px]

            ${mobileChat ? "hidden lg:flex" : "flex"}
          `}
        >
          {/* SIDEBAR HEADER */}

          <div className="shrink-0 px-4 pb-3 pt-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <h1 className="m-0 text-[22px] font-bold tracking-tight text-gray-900">
                  {currentUser?.username || "Tin nhắn"}
                </h1>

                <span
                  className={`
                    h-2
                    w-2
                    rounded-full

                    ${socketConnected ? "bg-green-500" : "bg-gray-300"}
                  `}
                  title={socketConnected ? "Đã kết nối" : "Mất kết nối"}
                />
              </div>

              <Avatar size={32} src={currentUser?.avatar}>
                {currentUser?.username?.charAt(0)?.toUpperCase()}
              </Avatar>
            </div>

            <Input
              prefix={<SearchOutlined className="text-gray-400" />}
              placeholder="Tìm kiếm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
              variant="filled"
              className="h-9 !rounded-xl !bg-[#efefef] text-sm [&_.ant-input]:!bg-transparent [&.ant-input-affix-wrapper]:!border-0 [&.ant-input-affix-wrapper]:!shadow-none"
            />
          </div>

          {/* LIST */}

          <div className="min-h-0 flex-1 overflow-y-auto pb-2">
            {filteredConversations.length === 0 ? (
              <div className="flex h-full items-center justify-center px-6">
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    search
                      ? "Không tìm thấy người dùng"
                      : "Chưa có cuộc trò chuyện"
                  }
                />
              </div>
            ) : (
              filteredConversations.map((conversation) => {
                const user = getOtherParticipant(conversation);

                if (!user) return null;

                const active =
                  String(conversation._id) === String(selectedConversationId);

                const lastMessage = conversation.lastMessage;

                return (
                  <button
                    key={conversation._id}
                    type="button"
                    onClick={() => handleSelectConversation(conversation._id)}
                    className={`
                        flex
                        w-full
                        items-center
                        gap-3
                        border-0
                        px-4
                        py-2.5
                        text-left
                        transition
                        duration-100

                        ${active ? "bg-[#efefef]" : "bg-white hover:bg-[#fafafa]"}
                      `}
                  >
                    {/* AVATAR */}

                    <div className="relative shrink-0">
                      <Avatar size={56} src={user.avatar}>
                        {user.username?.charAt(0)?.toUpperCase()}
                      </Avatar>

                      {user.status === "active" && (
                        <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-[2.5px] border-white bg-green-500" />
                      )}
                    </div>

                    {/* INFO */}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-gray-900">
                          {user.username}
                        </span>
                      </div>

                      <p className="m-0 mt-0.5 truncate text-[13px] text-gray-500">
                        {lastMessage?.content
                          ? lastMessage.content
                          : "Chưa có tin nhắn"}
                        {lastMessage?.createdAt && (
                          <span className="text-gray-400">
                            {" · " +
                              formatConversationTime(lastMessage.createdAt)}
                          </span>
                        )}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ================================================= */}
        {/* CHAT */}
        {/* ================================================= */}

        <main
          className={`
    h-full
    min-h-0
    min-w-0
    flex-1
    overflow-hidden
    flex-col
    bg-white
    ${mobileChat ? "flex" : "hidden lg:flex"}
  `}
        >
          {!selectedConversation ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-gray-900">
                <SendOutlinedMirrored />
              </div>
              <p className="m-0 text-xl font-light text-gray-900">
                Tin nhắn của bạn
              </p>
              <p className="m-0 text-sm text-gray-500">
                Chọn một cuộc trò chuyện để bắt đầu
              </p>
            </div>
          ) : (
            <>
              {/* ================================================= */}
              {/* CHAT HEADER */}
              {/* ================================================= */}

              <header className="z-10 flex h-[64px] shrink-0 items-center justify-between border-b border-gray-200 bg-white px-3 sm:px-5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Button
                    type="text"
                    icon={<ArrowLeftOutlined />}
                    className="lg:hidden"
                    onClick={handleBack}
                  />

                  <div className="relative">
                    <Avatar size={38} src={otherUser?.avatar}>
                      {otherUser?.username?.charAt(0)?.toUpperCase()}
                    </Avatar>

                    {otherUser?.status === "active" && (
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h2 className="m-0 truncate text-sm font-semibold text-gray-900">
                      {otherUser?.username}
                    </h2>

                    <p className="m-0 text-[11px] text-gray-400">
                      {otherUser?.status === "active"
                        ? "Đang hoạt động"
                        : "Ngoại tuyến"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Tooltip title="Gọi thoại">
                    <Button
                      type="text"
                      shape="circle"
                      size="large"
                      icon={<PhoneOutlined className="text-lg" />}
                    />
                  </Tooltip>

                  <Tooltip title="Video call">
                    <Button
                      type="text"
                      shape="circle"
                      size="large"
                      icon={<VideoCameraOutlined className="text-lg" />}
                    />
                  </Tooltip>

                  <Tooltip title="Thông tin">
                    <Button
                      type="text"
                      shape="circle"
                      size="large"
                      icon={<InfoCircleOutlined className="text-lg" />}
                    />
                  </Tooltip>
                </div>
              </header>

              {/* ================================================= */}
              {/* MESSAGES */}
              {/* ================================================= */}

              <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-white px-3 py-4 sm:px-6">
                <div className="mx-auto flex w-full min-w-0 max-w-4xl flex-col gap-0.5">
                  {loadingMessages ? (
                    <div className="flex min-h-[300px] flex-1 items-center justify-center">
                      <Spin />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 text-center">
                      <Avatar size={80} src={otherUser?.avatar}>
                        {otherUser?.username?.charAt(0)?.toUpperCase()}
                      </Avatar>
                      <p className="m-0 text-base font-semibold text-gray-900">
                        {otherUser?.username}
                      </p>
                      <p className="m-0 text-sm text-gray-400">
                        Chưa có tin nhắn. Hãy bắt đầu cuộc trò chuyện.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="my-3 text-center">
                        <span className="text-[12px] font-medium text-gray-400">
                          Hôm nay
                        </span>
                      </div>

                      {messages.map((item, index) => {
                        const senderId = item.senderId?._id || item.senderId;

                        const isMe = String(senderId) === String(currentUserId);

                        const prevItem = messages[index - 1];

                        const prevSenderId =
                          prevItem?.senderId?._id || prevItem?.senderId;

                        const isSameSenderAsPrev =
                          prevItem && String(prevSenderId) === String(senderId);

                        return (
                          <div
                            key={item._id || item.clientMessageId}
                            className={`
    flex
    min-w-0
    max-w-full
    items-end
    gap-2
    ${isSameSenderAsPrev ? "mt-0.5" : "mt-3"}
    ${isMe ? "justify-end" : "justify-start"}
  `}
                          >
                            {!isMe && (
                              <div className="w-6 shrink-0">
                                {!isSameSenderAsPrev && (
                                  <Avatar
                                    size={24}
                                    src={
                                      item.senderId?.avatar || otherUser?.avatar
                                    }
                                  >
                                    {item.senderId?.username
                                      ?.charAt(0)
                                      ?.toUpperCase()}
                                  </Avatar>
                                )}
                              </div>
                            )}

                            <div
                              className={`
    group
    min-w-0
    max-w-[65%]
    flex
    flex-col
    ${isMe ? "items-end" : "items-start"}
  `}
                            >
                              <div
                                className={`
    min-w-0
    max-w-full
    break-words
    break-all
    whitespace-pre-wrap
    overflow-hidden
    rounded-[20px]
    px-3.5
    py-2
    text-sm
    leading-5
    ${
      isMe
        ? "bg-gradient-to-br from-[#4776E6] to-[#8E54E9] text-white"
        : "bg-[#efefef] text-gray-900"
    }
  `}
                              >
                                {item.content}
                              </div>

                              <div className="mt-0.5 hidden items-center gap-1 px-1 text-[10px] text-gray-400 group-hover:flex">
                                <span>{formatTime(item.createdAt)}</span>

                                {isMe && (
                                  <CheckOutlined className="text-[9px]" />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* ================================================= */}
              {/* INPUT */}
              {/* ================================================= */}

              <div className="shrink-0 bg-white px-3 pb-3 pt-1 sm:px-5 sm:pb-4">
                <div className="mx-auto w-full min-w-0 max-w-4xl">
                  <div className="flex min-w-0 items-center gap-1.5 rounded-full border border-gray-300 bg-white px-2 py-1.5">
                    <Tooltip title="Emoji">
                      <Button
                        type="text"
                        shape="circle"
                        icon={
                          <SmileOutlined className="text-xl text-gray-700" />
                        }
                        className="shrink-0"
                      />
                    </Tooltip>

                    <Input.TextArea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      autoSize={{
                        minRows: 1,
                        maxRows: 5,
                      }}
                      placeholder="Nhắn tin..."
                      variant="borderless"
                      className="!resize-none !px-1 !py-1 text-sm"
                    />

                    <Tooltip title="Ảnh / File">
                      <Button
                        type="text"
                        shape="circle"
                        icon={
                          <FileImageOutlined className="text-xl text-gray-700" />
                        }
                        className="shrink-0"
                      />
                    </Tooltip>

                    {input.trim() ? (
                      <Button
                        type="text"
                        onClick={handleSendMessage}
                        disabled={!socketConnected}
                        className="shrink-0 !px-2 !font-semibold !text-[#3797f0] disabled:!text-gray-300"
                      >
                        Gửi
                      </Button>
                    ) : (
                      <>
                        <Tooltip title="Ghi âm">
                          <Button
                            type="text"
                            shape="circle"
                            icon={
                              <AudioOutlined className="text-xl text-gray-700" />
                            }
                            className="shrink-0"
                          />
                        </Tooltip>

                        <Tooltip title="Thích">
                          <Button
                            type="text"
                            shape="circle"
                            icon={
                              <HeartOutlined className="text-xl text-gray-700" />
                            }
                            className="shrink-0"
                          />
                        </Tooltip>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

// =====================================================
// Small inline "paper-plane" glyph used on the Instagram-style
// empty state (kept local so no new icon dependency is required)
// =====================================================

function SendOutlinedMirrored() {
  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="text-gray-900"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
