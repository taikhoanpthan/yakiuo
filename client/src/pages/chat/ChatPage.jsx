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
  InfoCircleOutlined,
  PhoneOutlined,
  SearchOutlined,
  SendOutlined,
  SmileOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";

import {
  connectSocket,
  getSocket,
} from "../../services/socket";

import api from "../../services/api";

// =====================================================
// HELPERS
// =====================================================

const getCurrentUser = () => {
  try {
    const user =
      localStorage.getItem("user") ||
      localStorage.getItem("currentUser");

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

  return new Date(date).toLocaleTimeString(
    "vi-VN",
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  );
};

const formatConversationTime = (date) => {
  if (!date) return "";

  const messageDate = new Date(date);
  const now = new Date();

  if (
    messageDate.toDateString() ===
    now.toDateString()
  ) {
    return formatTime(date);
  }

  return messageDate.toLocaleDateString(
    "vi-VN",
    {
      day: "2-digit",
      month: "2-digit",
    },
  );
};

// =====================================================
// COMPONENT
// =====================================================

export default function ChatPage() {
  // ===================================================
  // USER
  // ===================================================

  const currentUser = getCurrentUser();

  const currentUserId =
    getUserId(currentUser);

  // ===================================================
  // STATE
  // ===================================================

  const [conversations, setConversations] =
    useState([]);

  const [
    selectedConversationId,
    setSelectedConversationId,
  ] = useState(null);

  const [messages, setMessages] =
    useState([]);

  const [
    loadingConversations,
    setLoadingConversations,
  ] = useState(true);

  const [
    loadingMessages,
    setLoadingMessages,
  ] = useState(false);

  const [search, setSearch] =
    useState("");

  const [input, setInput] =
    useState("");

  const [mobileChat, setMobileChat] =
    useState(false);

  const [
    socketConnected,
    setSocketConnected,
  ] = useState(false);

  // ===================================================
  // REFS
  // ===================================================

  const messagesEndRef =
    useRef(null);

  const currentConversationRef =
    useRef(null);

  const previousConversationRef =
    useRef(null);

  // ===================================================
  // CURRENT CONVERSATION REF
  // ===================================================

  useEffect(() => {
    currentConversationRef.current =
      selectedConversationId;
  }, [selectedConversationId]);

  // ===================================================
  // OTHER USER
  // ===================================================

  const getOtherParticipant = (
    conversation,
  ) => {
    if (
      !conversation?.participants
    ) {
      return null;
    }

    return conversation.participants.find(
      (user) =>
        String(user._id) !==
        String(currentUserId),
    );
  };

  // ===================================================
  // LOAD CONVERSATIONS
  // ===================================================

  const loadConversations =
    async () => {
      try {
        setLoadingConversations(true);

        const response =
          await api.get(
            "/conversations",
          );

        const data =
          response?.data?.data || [];

        setConversations(data);

        if (
          data.length > 0 &&
          !selectedConversationId
        ) {
          setSelectedConversationId(
            data[0]._id,
          );
        }
      } catch (error) {
        console.error(
          "Load conversations error:",
          error,
        );

        antMessage.error(
          error?.response?.data
            ?.message ||
            "Không thể tải cuộc trò chuyện",
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

  const selectedConversation =
    useMemo(() => {
      return conversations.find(
        (conversation) =>
          String(conversation._id) ===
          String(
            selectedConversationId,
          ),
      );
    }, [
      conversations,
      selectedConversationId,
    ]);

  const otherUser =
    getOtherParticipant(
      selectedConversation,
    );

  // ===================================================
  // LOAD MESSAGES
  // ===================================================

  const loadMessages = async (
    conversationId,
  ) => {
    if (!conversationId) return;

    try {
      setLoadingMessages(true);

      const response =
        await api.get(
          `/messages/${conversationId}`,
          {
            params: {
              page: 1,
              limit: 100,
            },
          },
        );

      const data =
        response?.data?.data || [];

      setMessages(data);
    } catch (error) {
      console.error(
        "Load messages error:",
        error,
      );

      antMessage.error(
        error?.response?.data
          ?.message ||
          "Không thể tải tin nhắn",
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

    loadMessages(
      selectedConversationId,
    );
  }, [selectedConversationId]);

  // ===================================================
  // SOCKET
  // ===================================================

  useEffect(() => {
    const socket =
      connectSocket();

    if (!socket) return;

    const handleConnect = () => {
      console.log(
        "🟢 Chat socket connected:",
        socket.id,
      );

      setSocketConnected(true);

      const conversationId =
        currentConversationRef.current;

      if (conversationId) {
        socket.emit(
          "conversation:join",
          {
            conversationId,
          },
        );
      }
    };

    const handleDisconnect = (
      reason,
    ) => {
      console.log(
        "🔴 Chat socket disconnected:",
        reason,
      );

      setSocketConnected(false);
    };

    const handleNewMessage = (
      newMessage,
    ) => {
      console.log(
        "📩 New message:",
        newMessage,
      );

      const conversationId =
        newMessage?.conversationId;

      if (!conversationId) return;

      // =============================================
      // UPDATE SIDEBAR
      // =============================================

      setConversations(
        (prev) => {
          const index =
            prev.findIndex(
              (conversation) =>
                String(
                  conversation._id,
                ) ===
                String(
                  conversationId,
                ),
            );

          if (index === -1) {
            return prev;
          }

          const updatedConversation = {
            ...prev[index],

            lastMessage:
              newMessage,

            lastMessageAt:
              newMessage.createdAt,
          };

          const next = [
            updatedConversation,
            ...prev.filter(
              (_, i) =>
                i !== index,
            ),
          ];

          return next;
        },
      );

      // =============================================
      // KHÔNG PHẢI CHAT HIỆN TẠI
      // =============================================

      if (
        String(
          conversationId,
        ) !==
        String(
          currentConversationRef.current,
        )
      ) {
        return;
      }

      // =============================================
      // ADD MESSAGE
      // =============================================

      setMessages(
        (prev) => {
          if (
            newMessage?._id &&
            prev.some(
              (item) =>
                String(item._id) ===
                String(
                  newMessage._id,
                ),
            )
          ) {
            return prev;
          }

          if (
            newMessage?.clientMessageId &&
            prev.some(
              (item) =>
                item.clientMessageId ===
                newMessage.clientMessageId,
            )
          ) {
            return prev;
          }

          return [
            ...prev,
            newMessage,
          ];
        },
      );
    };

    const handleMessageError = (
      error,
    ) => {
      console.error(
        "❌ message:error",
        error,
      );

      antMessage.error(
        error?.message ||
          "Không thể gửi tin nhắn",
      );
    };

    const handleChatError = (
      error,
    ) => {
      console.error(
        "❌ chat:error",
        error,
      );

      antMessage.error(
        error?.message ||
          "Lỗi chat",
      );
    };

    socket.on(
      "connect",
      handleConnect,
    );

    socket.on(
      "disconnect",
      handleDisconnect,
    );

    socket.on(
      "message:new",
      handleNewMessage,
    );

    socket.on(
      "message:error",
      handleMessageError,
    );

    socket.on(
      "chat:error",
      handleChatError,
    );

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off(
        "connect",
        handleConnect,
      );

      socket.off(
        "disconnect",
        handleDisconnect,
      );

      socket.off(
        "message:new",
        handleNewMessage,
      );

      socket.off(
        "message:error",
        handleMessageError,
      );

      socket.off(
        "chat:error",
        handleChatError,
      );
    };
  }, []);

  // ===================================================
  // JOIN / LEAVE ROOM
  // ===================================================

  useEffect(() => {
    const socket =
      getSocket();

    if (
      !socket ||
      !selectedConversationId
    ) {
      return;
    }

    const previousConversation =
      previousConversationRef.current;

    if (
      previousConversation &&
      String(
        previousConversation,
      ) !==
        String(
          selectedConversationId,
        )
    ) {
      socket.emit(
        "conversation:leave",
        {
          conversationId:
            previousConversation,
        },
      );
    }

    if (socket.connected) {
      socket.emit(
        "conversation:join",
        {
          conversationId:
            selectedConversationId,
        },
      );
    }

    previousConversationRef.current =
      selectedConversationId;
  }, [selectedConversationId]);

  // ===================================================
  // AUTO SCROLL
  // ===================================================

  useEffect(() => {
    const timer =
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView(
          {
            behavior: "smooth",
          },
        );
      }, 80);

    return () =>
      clearTimeout(timer);
  }, [messages]);

  // ===================================================
  // SEARCH
  // ===================================================

  const filteredConversations =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      if (!keyword) {
        return conversations;
      }

      return conversations.filter(
        (conversation) => {
          const user =
            getOtherParticipant(
              conversation,
            );

          if (!user) return false;

          return (
            user.username
              ?.toLowerCase()
              .includes(keyword) ||
            user.email
              ?.toLowerCase()
              .includes(keyword)
          );
        },
      );
    }, [
      conversations,
      search,
      currentUserId,
    ]);

  // ===================================================
  // SELECT
  // ===================================================

  const handleSelectConversation =
    (conversationId) => {
      setSelectedConversationId(
        conversationId,
      );

      setMessages([]);

      setInput("");

      setMobileChat(true);
    };

  // ===================================================
  // SEND
  // ===================================================

  const handleSendMessage =
    () => {
      const content =
        input.trim();

      if (!content) return;

      if (
        !selectedConversationId
      ) {
        antMessage.warning(
          "Vui lòng chọn cuộc trò chuyện",
        );
        return;
      }

      const socket =
        getSocket();

      if (
        !socket ||
        !socket.connected
      ) {
        antMessage.error(
          "Socket chưa kết nối",
        );
        return;
      }

      if (!currentUserId) {
        antMessage.error(
          "Không xác định được người dùng",
        );
        return;
      }

      const clientMessageId =
        `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 10)}`;

      socket.emit(
        "message:send",
        {
          conversationId:
            selectedConversationId,

          senderId:
            currentUserId,

          content,

          clientMessageId,
        },
      );

      setInput("");
    };

  // ===================================================
  // ENTER
  // ===================================================

  const handleKeyDown = (
    event,
  ) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      handleSendMessage();
    }
  };

  // ===================================================
  // BACK
  // ===================================================

  const handleBack = () => {
    const socket =
      getSocket();

    if (
      socket &&
      selectedConversationId
    ) {
      socket.emit(
        "conversation:leave",
        {
          conversationId:
            selectedConversationId,
        },
      );
    }

    setMobileChat(false);
  };

  // ===================================================
  // LOADING
  // ===================================================

  if (loadingConversations) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-[#f5f7fb]">
        <Spin size="large" />
      </div>
    );
  }

  // ===================================================
  // UI
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

    <div className="flex min-h-0 flex-1 overflow-hidden bg-[#f5f7fb]">
      <div className="flex min-h-0 w-full overflow-hidden bg-white lg:m-4 lg:rounded-2xl lg:border lg:border-gray-200 lg:shadow-sm">

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
            lg:w-[350px]

            ${
              mobileChat
                ? "hidden lg:flex"
                : "flex"
            }
          `}
        >
          {/* SIDEBAR HEADER */}

          <div className="shrink-0 border-b border-gray-100 px-4 pb-3 pt-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="m-0 text-xl font-bold text-gray-900">
                    Tin nhắn
                  </h1>

                  <span
                    className={`
                      h-2
                      w-2
                      rounded-full

                      ${
                        socketConnected
                          ? "bg-green-500"
                          : "bg-gray-300"
                      }
                    `}
                  />
                </div>

                <p className="mt-1 text-xs text-gray-400">
                  Trao đổi nội bộ
                </p>
              </div>

              <Avatar
                size={40}
                src={
                  currentUser?.avatar
                }
              >
                {currentUser?.username
                  ?.charAt(0)
                  ?.toUpperCase()}
              </Avatar>
            </div>

            <Input
              prefix={
                <SearchOutlined className="text-gray-400" />
              }
              placeholder="Tìm kiếm..."
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value,
                )
              }
              allowClear
              className="h-10 rounded-xl"
            />
          </div>

          {/* LIST */}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {filteredConversations.length ===
            0 ? (
              <div className="flex h-full items-center justify-center px-6">
                <Empty
                  image={
                    Empty.PRESENTED_IMAGE_SIMPLE
                  }
                  description={
                    search
                      ? "Không tìm thấy người dùng"
                      : "Chưa có cuộc trò chuyện"
                  }
                />
              </div>
            ) : (
              filteredConversations.map(
                (conversation) => {
                  const user =
                    getOtherParticipant(
                      conversation,
                    );

                  if (!user) return null;

                  const active =
                    String(
                      conversation._id,
                    ) ===
                    String(
                      selectedConversationId,
                    );

                  const lastMessage =
                    conversation.lastMessage;

                  return (
                    <button
                      key={
                        conversation._id
                      }
                      type="button"
                      onClick={() =>
                        handleSelectConversation(
                          conversation._id,
                        )
                      }
                      className={`
                        group
                        flex
                        w-full
                        items-center
                        gap-3
                        border-0
                        px-4
                        py-3
                        text-left
                        transition

                        ${
                          active
                            ? "bg-blue-50"
                            : "bg-white hover:bg-gray-50"
                        }
                      `}
                    >
                      {/* AVATAR */}

                      <div className="relative shrink-0">
                        <Avatar
                          size={50}
                          src={
                            user.avatar
                          }
                        >
                          {user.username
                            ?.charAt(
                              0,
                            )
                            ?.toUpperCase()}
                        </Avatar>

                        {user.status ===
                          "active" && (
                          <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500" />
                        )}
                      </div>

                      {/* INFO */}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-gray-900">
                            {
                              user.username
                            }
                          </span>

                          {lastMessage?.createdAt && (
                            <span className="shrink-0 text-[10px] text-gray-400">
                              {formatConversationTime(
                                lastMessage.createdAt,
                              )}
                            </span>
                          )}
                        </div>

                        <p className="m-0 mt-1 truncate text-xs text-gray-400">
                          {lastMessage?.content ||
                            "Chưa có tin nhắn"}
                        </p>
                      </div>
                    </button>
                  );
                },
              )
            )}
          </div>
        </aside>

        {/* ================================================= */}
        {/* CHAT */}
        {/* ================================================= */}

        <main
          className={`
            min-h-0
            min-w-0
            flex-1
            flex-col
            bg-[#f8fafc]

            ${
              mobileChat
                ? "flex"
                : "hidden lg:flex"
            }
          `}
        >
          {!selectedConversation ? (
            <div className="flex min-h-0 flex-1 items-center justify-center">
              <Empty description="Chọn một cuộc trò chuyện" />
            </div>
          ) : (
            <>
              {/* ================================================= */}
              {/* CHAT HEADER */}
              {/* ================================================= */}

              <header className="z-10 flex h-[64px] shrink-0 items-center justify-between border-b border-gray-200 bg-white px-3 sm:px-5">
                <div className="flex min-w-0 items-center gap-2">
                  <Button
                    type="text"
                    icon={
                      <ArrowLeftOutlined />
                    }
                    className="lg:hidden"
                    onClick={
                      handleBack
                    }
                  />

                  <div className="relative">
                    <Avatar
                      size={42}
                      src={
                        otherUser?.avatar
                      }
                    >
                      {otherUser?.username
                        ?.charAt(
                          0,
                        )
                        ?.toUpperCase()}
                    </Avatar>

                    {otherUser?.status ===
                      "active" && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h2 className="m-0 truncate text-sm font-semibold text-gray-900">
                      {
                        otherUser?.username
                      }
                    </h2>

                    <p className="m-0 text-[11px] text-gray-400">
                      {otherUser?.status ===
                      "active"
                        ? "Đang hoạt động"
                        : "Ngoại tuyến"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-0.5">
                  <Tooltip title="Gọi thoại">
                    <Button
                      type="text"
                      shape="circle"
                      icon={
                        <PhoneOutlined />
                      }
                    />
                  </Tooltip>

                  <Tooltip title="Video call">
                    <Button
                      type="text"
                      shape="circle"
                      icon={
                        <VideoCameraOutlined />
                      }
                    />
                  </Tooltip>

                  <Tooltip title="Thông tin">
                    <Button
                      type="text"
                      shape="circle"
                      icon={
                        <InfoCircleOutlined />
                      }
                    />
                  </Tooltip>
                </div>
              </header>

              {/* ================================================= */}
              {/* MESSAGES */}
              {/* ================================================= */}

              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6">
                <div className="mx-auto flex max-w-4xl flex-col gap-3">
                  {loadingMessages ? (
                    <div className="flex min-h-[300px] flex-1 items-center justify-center">
                      <Spin />
                    </div>
                  ) : messages.length ===
                    0 ? (
                    <div className="flex min-h-[400px] items-center justify-center">
                      <Empty
                        image={
                          Empty.PRESENTED_IMAGE_SIMPLE
                        }
                        description="Chưa có tin nhắn. Hãy bắt đầu cuộc trò chuyện."
                      />
                    </div>
                  ) : (
                    <>
                      <div className="my-2 text-center">
                        <span className="rounded-full bg-gray-200/70 px-3 py-1 text-[10px] text-gray-500">
                          Tin nhắn
                        </span>
                      </div>

                      {messages.map(
                        (item) => {
                          const senderId =
                            item.senderId
                              ?._id ||
                            item.senderId;

                          const isMe =
                            String(
                              senderId,
                            ) ===
                            String(
                              currentUserId,
                            );

                          return (
                            <div
                              key={
                                item._id ||
                                item.clientMessageId
                              }
                              className={`
                                flex
                                items-end
                                gap-2

                                ${
                                  isMe
                                    ? "justify-end"
                                    : "justify-start"
                                }
                              `}
                            >
                              {!isMe && (
                                <Avatar
                                  size={30}
                                  src={
                                    item
                                      .senderId
                                      ?.avatar ||
                                    otherUser?.avatar
                                  }
                                >
                                  {item
                                    .senderId
                                    ?.username
                                    ?.charAt(
                                      0,
                                    )
                                    ?.toUpperCase()}
                                </Avatar>
                              )}

                              <div
                                className={`
                                  flex
                                  max-w-[78%]
                                  flex-col

                                  ${
                                    isMe
                                      ? "items-end"
                                      : "items-start"
                                  }
                                `}
                              >
                                <div
                                  className={`
                                    break-words
                                    whitespace-pre-wrap
                                    rounded-2xl
                                    px-4
                                    py-2.5
                                    text-sm
                                    leading-6
                                    shadow-sm

                                    ${
                                      isMe
                                        ? "rounded-br-md bg-blue-600 text-white"
                                        : "rounded-bl-md bg-white text-gray-800"
                                    }
                                  `}
                                >
                                  {
                                    item.content
                                  }
                                </div>

                                <div className="mt-1 flex items-center gap-1 px-1 text-[10px] text-gray-400">
                                  <span>
                                    {formatTime(
                                      item.createdAt,
                                    )}
                                  </span>

                                  {isMe && (
                                    <CheckOutlined className="text-[9px]" />
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        },
                      )}
                    </>
                  )}

                  <div
                    ref={
                      messagesEndRef
                    }
                  />
                </div>
              </div>

              {/* ================================================= */}
              {/* INPUT */}
              {/* ================================================= */}

              <div className="shrink-0 border-t border-gray-200 bg-white p-2.5 sm:p-4">
                <div className="mx-auto max-w-4xl">
                  <div className="flex items-end gap-1.5 rounded-2xl border border-gray-200 bg-gray-50 px-2 py-1.5 focus-within:border-blue-400 focus-within:bg-white">
                    <Tooltip title="Emoji">
                      <Button
                        type="text"
                        shape="circle"
                        icon={
                          <SmileOutlined />
                        }
                        className="shrink-0 text-gray-500"
                      />
                    </Tooltip>

                    <Tooltip title="Ảnh / File">
                      <Button
                        type="text"
                        shape="circle"
                        icon={
                          <FileImageOutlined />
                        }
                        className="shrink-0 text-gray-500"
                      />
                    </Tooltip>

                    <Input.TextArea
                      value={input}
                      onChange={(e) =>
                        setInput(
                          e.target.value,
                        )
                      }
                      onKeyDown={
                        handleKeyDown
                      }
                      autoSize={{
                        minRows: 1,
                        maxRows: 5,
                      }}
                      placeholder="Nhắn tin..."
                      variant="borderless"
                      className="!resize-none !px-1 !py-2"
                    />

                    {input.trim() ? (
                      <Button
                        type="primary"
                        shape="circle"
                        icon={
                          <SendOutlined />
                        }
                        onClick={
                          handleSendMessage
                        }
                        disabled={
                          !socketConnected
                        }
                        className="shrink-0"
                      />
                    ) : (
                      <Tooltip title="Ghi âm">
                        <Button
                          type="text"
                          shape="circle"
                          icon={
                            <AudioOutlined />
                          }
                          className="shrink-0 text-gray-500"
                        />
                      </Tooltip>
                    )}
                  </div>

                  <p className="m-0 mt-1 hidden text-center text-[10px] text-gray-400 sm:block">
                    Enter để gửi · Shift + Enter
                    để xuống dòng
                  </p>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}