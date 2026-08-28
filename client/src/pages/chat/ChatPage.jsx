import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Avatar,
  Button,
  Empty,
  Input,
  Popconfirm,
  Spin,
  Tooltip,
  message as antMessage,
} from "antd";

import {
  ArrowLeftOutlined,
  AudioOutlined,
  CheckOutlined,
  CheckCircleFilled,
  DeleteOutlined,
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
import { useAuth } from "../../store/AuthContext";

// =====================================================
// HELPERS
// =====================================================

const getUserId = (user) => {
  if (!user) return null;

  if (typeof user === "string") {
    return user;
  }

  return user._id || user.id || user.userId || null;
};

const normalizeId = (id) => {
  if (!id) return null;

  return String(id);
};

const getSenderId = (message) => {
  if (!message) return null;

  if (typeof message.senderId === "object") {
    return (
      message.senderId?._id ||
      message.senderId?.id ||
      message.senderId?.userId ||
      null
    );
  }

  return message.senderId || null;
};

const getOnlineUserId = (payload) => {
  if (!payload) return null;

  if (typeof payload === "string") {
    return payload;
  }

  if (typeof payload === "number") {
    return String(payload);
  }

  return (
    payload.userId ||
    payload._id ||
    payload.id ||
    payload.user?._id ||
    payload.user?.id ||
    payload.user?.userId ||
    null
  );
};

const normalizeOnlineUsers = (payload) => {
  if (!payload) {
    return [];
  }

  // Backend có thể trả:
  // ["id1", "id2"]
  if (Array.isArray(payload)) {
    return [
      ...new Set(
        payload
          .map((item) => getOnlineUserId(item))
          .filter(Boolean)
          .map(String),
      ),
    ];
  }

  // Hoặc:
  // { users: [...] }
  // { onlineUsers: [...] }
  // { data: [...] }
  if (typeof payload === "object") {
    const list =
      payload.users ||
      payload.onlineUsers ||
      payload.data ||
      payload.userIds;

    if (Array.isArray(list)) {
      return [
        ...new Set(
          list
            .map((item) => getOnlineUserId(item))
            .filter(Boolean)
            .map(String),
        ),
      ];
    }

    const singleId = getOnlineUserId(payload);

    return singleId ? [String(singleId)] : [];
  }

  return [];
};

const formatTime = (date) => {
  if (!date) return "";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatConversationTime = (date) => {
  if (!date) return "";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const now = new Date();

  if (parsed.toDateString() === now.toDateString()) {
    return formatTime(date);
  }

  return parsed.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });
};

const getUserName = (user) => {
  return (
    user?.username ||
    user?.fullName ||
    user?.email ||
    "Người dùng"
  );
};

const getInitial = (user) => {
  return getUserName(user).charAt(0).toUpperCase();
};

// =====================================================
// COMPONENT
// =====================================================

export default function ChatPage() {
  // ===================================================
  // CURRENT USER
  // ===================================================

  const { user: currentUser } = useAuth();

  const currentUserId = normalizeId(
    getUserId(currentUser),
  );

  // ===================================================
  // DATA
  // ===================================================

  const [users, setUsers] = useState([]);

  const [conversations, setConversations] = useState([]);

  const [messages, setMessages] = useState([]);

  // ===================================================
  // ONLINE USERS
  // ===================================================

  const [onlineUsers, setOnlineUsers] = useState([]);

  // ===================================================
  // SELECTED CHAT
  // ===================================================

  const [selectedConversationId, setSelectedConversationId] =
    useState(null);

  // ===================================================
  // UI
  // ===================================================

  const [search, setSearch] = useState("");

  const [input, setInput] = useState("");

  const [mobileChat, setMobileChat] = useState(false);

  // ===================================================
  // LOADING
  // ===================================================

  const [loadingUsers, setLoadingUsers] = useState(true);

  const [loadingConversations, setLoadingConversations] =
    useState(true);

  const [loadingMessages, setLoadingMessages] =
    useState(false);

  // ===================================================
  // SOCKET STATE
  // ===================================================

  const [socketConnected, setSocketConnected] =
    useState(false);

  // ===================================================
  // REFS
  // ===================================================

  const messagesContainerRef = useRef(null);

  const currentConversationRef = useRef(null);

  const previousConversationRef = useRef(null);

  // ===================================================
  // KEEP CURRENT CONVERSATION REF
  // ===================================================

  useEffect(() => {
    currentConversationRef.current =
      selectedConversationId;
  }, [selectedConversationId]);

  // ===================================================
  // CHECK ONLINE
  // ===================================================

  const isUserOnline = useCallback(
    (userId) => {
      const normalizedId = normalizeId(userId);

      if (!normalizedId) {
        return false;
      }

      return onlineUsers.includes(normalizedId);
    },
    [onlineUsers],
  );

  // ===================================================
  // GET OTHER PARTICIPANT
  // ===================================================

  const getOtherParticipant = useCallback(
    (conversation) => {
      if (!conversation?.participants) {
        return null;
      }

      return (
        conversation.participants.find(
          (user) =>
            normalizeId(getUserId(user)) !==
            currentUserId,
        ) || null
      );
    },
    [currentUserId],
  );

  // ===================================================
  // LOAD USERS
  // ===================================================

  const loadUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);

      const response = await api.get("/users/chat");

      const data = response?.data?.data?.users;

      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Load users error:", error);

      antMessage.error(
        error?.response?.data?.message ||
          "Không thể tải danh sách người dùng",
      );

      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  // ===================================================
  // LOAD CONVERSATIONS
  // ===================================================

  const loadConversations = useCallback(async () => {
    try {
      setLoadingConversations(true);

      const response = await api.get("/conversations");

      const data = response?.data?.data;

      setConversations(
        Array.isArray(data) ? data : [],
      );
    } catch (error) {
      console.error(
        "Load conversations error:",
        error,
      );

      antMessage.error(
        error?.response?.data?.message ||
          "Không thể tải cuộc trò chuyện",
      );

      setConversations([]);
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  // ===================================================
  // INITIAL LOAD
  // ===================================================

  useEffect(() => {
    loadUsers();
    loadConversations();
  }, [loadUsers, loadConversations]);

  // ===================================================
  // LOAD MESSAGES
  // ===================================================

  const loadMessages = useCallback(
    async (conversationId) => {
      if (!conversationId) {
        setMessages([]);
        return;
      }

      try {
        setLoadingMessages(true);

        const response = await api.get(
          `/messages/${conversationId}`,
          {
            params: {
              page: 1,
              limit: 100,
            },
          },
        );

        const data = response?.data?.data;

        setMessages(
          Array.isArray(data) ? data : [],
        );
      } catch (error) {
        console.error(
          "Load messages error:",
          error,
        );

        antMessage.error(
          error?.response?.data?.message ||
            "Không thể tải tin nhắn",
        );

        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    },
    [],
  );

  // ===================================================
  // LOAD MESSAGE WHEN CHANGE CHAT
  // ===================================================

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }

    loadMessages(selectedConversationId);
  }, [selectedConversationId, loadMessages]);

  // Mở cuộc trò chuyện hoặc nhận tin nhắn mới sẽ xác nhận đã xem.
  const markConversationAsRead = useCallback(async (conversationId) => {
    if (!conversationId) return;

    const socket = getSocket();
    if (socket?.connected) {
      socket.emit("message:read", { conversationId });
    }

    try {
      await api.post(`/messages/${conversationId}/read`);
    } catch (error) {
      console.error("Mark conversation as read error:", error);
    }
  }, []);

  useEffect(() => {
    if (selectedConversationId && messages.length > 0) {
      markConversationAsRead(selectedConversationId);
    }
  }, [selectedConversationId, messages.length, markConversationAsRead]);

  // ===================================================
  // SOCKET
  // ===================================================

  useEffect(() => {
    const socket = connectSocket();

    if (!socket) {
      console.error(
        "❌ Không lấy được Socket.IO instance",
      );
      return;
    }

    // =================================================
    // SOCKET CONNECT
    // =================================================

    const handleConnect = () => {
      console.log(
        "🟢 Chat socket connected:",
        socket.id,
      );

      setSocketConnected(true);

      // ===============================================
      // QUAN TRỌNG:
      // ĐĂNG KÝ USER VỚI BACKEND
      // ===============================================

      if (currentUserId) {
        console.log(
          "👤 Register online user:",
          currentUserId,
        );

        socket.emit("user:join", {
          userId: currentUserId,
        });
      }

      // ===============================================
      // JOIN CURRENT CONVERSATION
      // ===============================================

      const conversationId =
        currentConversationRef.current;

      if (conversationId) {
        socket.emit("conversation:join", {
          conversationId,
        });
      }
    };

    // =================================================
    // SOCKET DISCONNECT
    // =================================================

    const handleDisconnect = (reason) => {
      console.log(
        "🔴 Chat socket disconnected:",
        reason,
      );

      setSocketConnected(false);
    };

    // =================================================
    // SOCKET CONNECT ERROR
    // =================================================

    const handleConnectError = (error) => {
      console.error(
        "❌ Socket connect error:",
        error,
      );

      setSocketConnected(false);
    };

    // =================================================
    // ALL ONLINE USERS
    // =================================================

    const handleUsersOnline = (payload) => {
      console.log(
        "🟢 users:online:",
        payload,
      );

      const normalized =
        normalizeOnlineUsers(payload);

      console.log(
        "🟢 normalized online users:",
        normalized,
      );

      setOnlineUsers(normalized);
    };

    // =================================================
    // ONLINE COUNT
    // =================================================

    const handleOnlineCount = (payload) => {
      console.log(
        "👥 online:count:",
        payload,
      );
    };

    // =================================================
    // USER ONLINE
    // =================================================

    const handleUserOnline = (payload) => {
      console.log(
        "🟢 user:online:",
        payload,
      );

      const userId =
        getOnlineUserId(payload);

      if (!userId) {
        return;
      }

      const normalizedId = String(userId);

      setOnlineUsers((prev) => {
        if (prev.includes(normalizedId)) {
          return prev;
        }

        return [...prev, normalizedId];
      });
    };

    // =================================================
    // USER OFFLINE
    // =================================================

    const handleUserOffline = (payload) => {
      console.log(
        "🔴 user:offline:",
        payload,
      );

      const userId =
        getOnlineUserId(payload);

      if (!userId) {
        return;
      }

      const normalizedId = String(userId);

      setOnlineUsers((prev) =>
        prev.filter(
          (id) => String(id) !== normalizedId,
        ),
      );
    };

    // =================================================
    // NEW MESSAGE
    // =================================================

    const handleNewMessage = (newMessage) => {
      console.log(
        "📩 message:new:",
        newMessage,
      );

      if (!newMessage) {
        return;
      }

      const conversationId =
        newMessage.conversationId;

      if (!conversationId) {
        return;
      }

      // ===============================================
      // UPDATE SIDEBAR
      // ===============================================

      setConversations((prev) => {
        const index = prev.findIndex(
          (conversation) =>
            normalizeId(conversation._id) ===
            normalizeId(conversationId),
        );

        // Conversation chưa có trong sidebar
        if (index === -1) {
          return prev;
        }

        const oldConversation =
          prev[index];

        const updatedConversation = {
          ...oldConversation,

          lastMessage: newMessage,

          lastMessageAt:
            newMessage.createdAt ||
            new Date().toISOString(),

          updatedAt:
            newMessage.createdAt ||
            oldConversation.updatedAt,
        };

        const rest = prev.filter(
          (_, i) => i !== index,
        );

        return [
          updatedConversation,
          ...rest,
        ];
      });

      // ===============================================
      // KHÔNG PHẢI CHAT ĐANG MỞ
      // ===============================================

      if (
        normalizeId(conversationId) !==
        normalizeId(
          currentConversationRef.current,
        )
      ) {
        return;
      }

      // ===============================================
      // ADD MESSAGE
      // ===============================================

      setMessages((prev) => {
        // Mongo ID
        if (
          newMessage._id &&
          prev.some(
            (item) =>
              normalizeId(item._id) ===
              normalizeId(newMessage._id),
          )
        ) {
          return prev;
        }

        // Client ID
        if (
          newMessage.clientMessageId &&
          prev.some(
            (item) =>
              item.clientMessageId ===
              newMessage.clientMessageId,
          )
        ) {
          return prev;
        }

        return [...prev, newMessage];
      });
    };

    const handleMessageRead = (payload = {}) => {
      if (normalizeId(payload.conversationId) !== normalizeId(currentConversationRef.current)) {
        return;
      }

      const readerId = normalizeId(payload.readerId);
      if (!readerId) return;

      setMessages((prev) => prev.map((item) => {
        if (normalizeId(getSenderId(item)) === readerId || item.deletedAt) return item;

        const seenBy = Array.isArray(item.seenBy) ? item.seenBy : [];
        const alreadySeen = seenBy.some((user) => normalizeId(getUserId(user)) === readerId);

        return alreadySeen ? item : { ...item, seenBy: [...seenBy, readerId] };
      }));
    };

    const handleMessageDeleted = (payload = {}) => {
      if (normalizeId(payload.conversationId) !== normalizeId(currentConversationRef.current)) {
        return;
      }

      setMessages((prev) => prev.map((item) => (
        normalizeId(item._id) === normalizeId(payload.messageId)
          ? { ...item, content: "", deletedAt: payload.deletedAt || new Date().toISOString() }
          : item
      )));

      loadConversations();
    };

    // =================================================
    // MESSAGE ERROR
    // =================================================

    const handleMessageError = (error) => {
      console.error(
        "❌ message:error:",
        error,
      );

      antMessage.error(
        error?.message ||
          error?.error ||
          "Không thể gửi tin nhắn",
      );
    };

    // =================================================
    // CHAT ERROR
    // =================================================

    const handleChatError = (error) => {
      console.error(
        "❌ chat:error:",
        error,
      );

      antMessage.error(
        error?.message ||
          error?.error ||
          "Lỗi chat",
      );
    };

    // =================================================
    // REGISTER LISTENERS
    // =================================================

    socket.on(
      "connect",
      handleConnect,
    );

    socket.on(
      "disconnect",
      handleDisconnect,
    );

    socket.on(
      "connect_error",
      handleConnectError,
    );

    socket.on(
      "users:online",
      handleUsersOnline,
    );

    socket.on(
      "online:count",
      handleOnlineCount,
    );

    socket.on(
      "user:online",
      handleUserOnline,
    );

    socket.on(
      "user:offline",
      handleUserOffline,
    );

    socket.on(
      "message:new",
      handleNewMessage,
    );

    socket.on("message:read", handleMessageRead);

    socket.on("message:deleted", handleMessageDeleted);

    socket.on(
      "message:error",
      handleMessageError,
    );

    socket.on(
      "chat:error",
      handleChatError,
    );

    // =================================================
    // SOCKET ĐÃ CONNECT SẴN
    // =================================================

    if (socket.connected) {
      handleConnect();
    }

    // =================================================
    // CLEANUP
    // =================================================

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
        "connect_error",
        handleConnectError,
      );

      socket.off(
        "users:online",
        handleUsersOnline,
      );

      socket.off(
        "online:count",
        handleOnlineCount,
      );

      socket.off(
        "user:online",
        handleUserOnline,
      );

      socket.off(
        "user:offline",
        handleUserOffline,
      );

      socket.off(
        "message:new",
        handleNewMessage,
      );

      socket.off("message:read", handleMessageRead);

      socket.off("message:deleted", handleMessageDeleted);

      socket.off(
        "message:error",
        handleMessageError,
      );

      socket.off(
        "chat:error",
        handleChatError,
      );

      // KHÔNG gọi disconnectSocket()
      //
      // Vì Layout cũng đang dùng chung socket.
    };
  }, [currentUserId, loadConversations]);

  // ===================================================
  // JOIN / LEAVE CONVERSATION
  // ===================================================

  useEffect(() => {
    const socket = getSocket();

    if (!socket) {
      return;
    }

    const previousConversation =
      previousConversationRef.current;

    // ===============================================
    // LEAVE OLD
    // ===============================================

    if (
      previousConversation &&
      normalizeId(previousConversation) !==
        normalizeId(selectedConversationId)
    ) {
      socket.emit("conversation:leave", {
        conversationId:
          previousConversation,
      });
    }

    // ===============================================
    // JOIN NEW
    // ===============================================

    if (
      selectedConversationId &&
      socket.connected
    ) {
      socket.emit("conversation:join", {
        conversationId:
          selectedConversationId,
      });
    }

    previousConversationRef.current =
      selectedConversationId;

    // ===============================================
    // CLEANUP
    // ===============================================

    return () => {
      if (
        selectedConversationId &&
        socket.connected
      ) {
        socket.emit("conversation:leave", {
          conversationId:
            selectedConversationId,
        });
      }
    };
  }, [selectedConversationId]);

  // ===================================================
  // SELECTED CONVERSATION
  // ===================================================

  const selectedConversation = useMemo(() => {
    if (!selectedConversationId) {
      return null;
    }

    return (
      conversations.find(
        (conversation) =>
          normalizeId(conversation._id) ===
          normalizeId(
            selectedConversationId,
          ),
      ) || null
    );
  }, [
    conversations,
    selectedConversationId,
  ]);

  const otherUser = useMemo(() => {
    return getOtherParticipant(
      selectedConversation,
    );
  }, [
    selectedConversation,
    getOtherParticipant,
  ]);

  // ===================================================
  // SEARCH KEYWORD
  // ===================================================

  const keyword = search
    .trim()
    .toLowerCase();

  // ===================================================
  // ONLINE USER LIST
  // ===================================================

  const onlineUserList = useMemo(() => {
    return users.filter((user) => {
      const userId = normalizeId(
        getUserId(user),
      );

      if (!userId) {
        return false;
      }

      // Không hiển thị chính mình
      if (userId === currentUserId) {
        return false;
      }

      // Chỉ online
      if (!onlineUsers.includes(userId)) {
        return false;
      }

      // Search
      if (!keyword) {
        return true;
      }

      const username =
        user.username?.toLowerCase() || "";

      const fullName =
        user.fullName?.toLowerCase() || "";

      const email =
        user.email?.toLowerCase() || "";

      return (
        username.includes(keyword) ||
        fullName.includes(keyword) ||
        email.includes(keyword)
      );
    });
  }, [
    users,
    onlineUsers,
    currentUserId,
    keyword,
  ]);

  // ===================================================
  // FILTER CONVERSATIONS
  // ===================================================

  const filteredConversations = useMemo(() => {
    if (!keyword) {
      return conversations;
    }

    return conversations.filter(
      (conversation) => {
        const user =
          getOtherParticipant(
            conversation,
          );

        if (!user) {
          return false;
        }

        const username =
          user.username?.toLowerCase() || "";

        const fullName =
          user.fullName?.toLowerCase() || "";

        const email =
          user.email?.toLowerCase() || "";

        return (
          username.includes(keyword) ||
          fullName.includes(keyword) ||
          email.includes(keyword)
        );
      },
    );
  }, [
    conversations,
    keyword,
    getOtherParticipant,
  ]);

  // ===================================================
  // FIND CONVERSATION
  // ===================================================

  const findConversationWithUser =
    useCallback(
      (userId) => {
        const targetId =
          normalizeId(userId);

        if (!targetId) {
          return null;
        }

        return (
          conversations.find(
            (conversation) => {
              const user =
                getOtherParticipant(
                  conversation,
                );

              return (
                normalizeId(
                  getUserId(user),
                ) === targetId
              );
            },
          ) || null
        );
      },
      [
        conversations,
        getOtherParticipant,
      ],
    );

  // ===================================================
  // START CHAT
  // ===================================================

  const handleStartChat = async (user) => {
    const userId = getUserId(user);

    if (!userId) {
      antMessage.error(
        "Không xác định được người dùng",
      );

      return;
    }

    // ===============================================
    // EXISTING
    // ===============================================

    const existingConversation =
      findConversationWithUser(userId);

    if (existingConversation) {
      setSelectedConversationId(
        existingConversation._id,
      );

      setInput("");

      setMobileChat(true);

      return;
    }

    // ===============================================
    // CREATE
    // ===============================================

    try {
      const response = await api.post(
        "/conversations",
        {
          userId,
        },
      );

      const conversation =
        response?.data?.data;

      if (!conversation?._id) {
        antMessage.error(
          "Không thể tạo cuộc trò chuyện",
        );

        return;
      }

      setConversations((prev) => {
        const exists = prev.some(
          (item) =>
            normalizeId(item._id) ===
            normalizeId(
              conversation._id,
            ),
        );

        if (exists) {
          return prev;
        }

        return [
          conversation,
          ...prev,
        ];
      });

      setSelectedConversationId(
        conversation._id,
      );

      setInput("");

      setMobileChat(true);
    } catch (error) {
      console.error(
        "Start chat error:",
        error,
      );

      antMessage.error(
        error?.response?.data?.message ||
          "Không thể bắt đầu cuộc trò chuyện",
      );
    }
  };

  // ===================================================
  // SELECT CONVERSATION
  // ===================================================

  const handleSelectConversation = (
    conversationId,
  ) => {
    setSelectedConversationId(
      conversationId,
    );

    setInput("");

    setMobileChat(true);
  };

  const handleDeleteMessage = async (messageId) => {
    if (!messageId) return;

    try {
      await api.delete(`/messages/${messageId}`);

      // Event Socket.IO sẽ đồng bộ đối phương; cập nhật ngay cả khi socket vừa mất kết nối.
      setMessages((prev) => prev.map((item) => (
        normalizeId(item._id) === normalizeId(messageId)
          ? { ...item, content: "", deletedAt: new Date().toISOString() }
          : item
      )));
      loadConversations();
      antMessage.success("Đã xóa tin nhắn");
    } catch (error) {
      antMessage.error(error?.response?.data?.message || "Không thể xóa tin nhắn");
    }
  };

  const handleDeleteConversation = async () => {
    if (!selectedConversationId) return;

    try {
      await api.delete(`/conversations/${selectedConversationId}`);
      const deletedId = selectedConversationId;

      setConversations((prev) => prev.filter(
        (conversation) => normalizeId(conversation._id) !== normalizeId(deletedId),
      ));
      setSelectedConversationId(null);
      setMessages([]);
      setMobileChat(false);
      antMessage.success("Đã xóa cuộc trò chuyện khỏi hộp thư của bạn");
    } catch (error) {
      antMessage.error(error?.response?.data?.message || "Không thể xóa cuộc trò chuyện");
    }
  };

  // ===================================================
  // SEND MESSAGE
  // ===================================================

  const handleSendMessage = () => {
    const content = input.trim();

    if (!content) {
      return;
    }

    if (!selectedConversationId) {
      antMessage.warning(
        "Vui lòng chọn cuộc trò chuyện",
      );

      return;
    }

    const socket = getSocket();

    if (!socket) {
      antMessage.error(
        "Không tìm thấy socket",
      );

      return;
    }

    if (!socket.connected) {
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

    // ===============================================
    // CLIENT MESSAGE ID
    // ===============================================

    const clientMessageId =
      `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}`;

    // ===============================================
    // SEND
    // ===============================================

    socket.emit("message:send", {
      conversationId:
        selectedConversationId,

      senderId: currentUserId,

      content,

      clientMessageId,
    });

    // ===============================================
    // CLEAR
    // ===============================================

    setInput("");
  };

  // ===================================================
  // ENTER SEND
  // ===================================================

  const handleKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      handleSendMessage();
    }
  };

  // ===================================================
  // MOBILE BACK
  // ===================================================

  const handleBack = () => {
    const socket = getSocket();

    if (
      socket &&
      selectedConversationId &&
      socket.connected
    ) {
      socket.emit("conversation:leave", {
        conversationId:
          selectedConversationId,
      });
    }

    setMobileChat(false);
  };

  // ===================================================
  // AUTO SCROLL
  // ===================================================

  useEffect(() => {
    const timer = setTimeout(() => {
      const container =
        messagesContainerRef.current;

      if (!container) {
        return;
      }

      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    }, 80);

    return () => clearTimeout(timer);
  }, [
    messages,
    loadingMessages,
  ]);

  // ===================================================
  // LOADING
  // ===================================================

  if (loadingConversations) {
    return (
      <div className="flex h-full min-h-0 w-full items-center justify-center overflow-hidden bg-white">
        <Spin size="large" />
      </div>
    );
  }

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <div
      className="
        flex
        h-full
        min-h-0
        min-w-0
        w-full
        overflow-hidden
        bg-white
        pb-0
      "
    >
      <div
        className="
          flex
          h-full
          min-h-0
          min-w-0
          w-full
          overflow-hidden
          bg-white
          lg:border
          lg:border-gray-200
        "
      >
        {/* ================================================= */}
        {/* SIDEBAR */}
        {/* ================================================= */}

        <aside
          className={`
            flex
            h-full
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
          {/* ================================================= */}
          {/* HEADER */}
          {/* ================================================= */}

          <div className="shrink-0 px-4 pb-3 pt-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h1 className="m-0 text-[22px] font-bold tracking-tight text-gray-900">
                  Tin nhắn
                </h1>

                <Tooltip
                  title={
                    socketConnected
                      ? "Realtime đang kết nối"
                      : "Realtime đang mất kết nối"
                  }
                >
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
                </Tooltip>
              </div>

              <Avatar
                size={34}
                src={currentUser?.avatar}
              >
                {getInitial(currentUser)}
              </Avatar>
            </div>

            {/* SEARCH */}

            <Input
              prefix={
                <SearchOutlined className="text-gray-400" />
              }
              placeholder="Tìm kiếm người hoặc cuộc trò chuyện"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              allowClear
              variant="filled"
              className="
                h-9
                !rounded-xl
                !bg-[#efefef]
                text-sm
                [&_.ant-input]:!bg-transparent
                [&.ant-input-affix-wrapper]:!border-0
                [&.ant-input-affix-wrapper]:!shadow-none
              "
            />
          </div>

          {/* ================================================= */}
          {/* ONLINE USERS */}
          {/* ================================================= */}

          <div className="shrink-0 border-b border-gray-100 px-4 pb-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Đang hoạt động
                </span>

                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              </div>

              <span className="text-xs text-gray-400">
                {onlineUserList.length}
              </span>
            </div>

            {loadingUsers ? (
              <div className="flex h-[70px] items-center justify-center">
                <Spin size="small" />
              </div>
            ) : onlineUserList.length === 0 ? (
              <div className="py-3 text-center text-xs text-gray-400">
                Không có ai đang online
              </div>
            ) : (
              <div
                className="
                  flex
                  gap-4
                  overflow-x-auto
                  pb-1
                  scrollbar-thin
                "
              >
                {onlineUserList.map((user) => {
                  const userId =
                    getUserId(user);

                  return (
                    <button
                      key={userId}
                      type="button"
                      onClick={() =>
                        handleStartChat(user)
                      }
                      className="
                        group
                        flex
                        w-[58px]
                        shrink-0
                        flex-col
                        items-center
                        border-0
                        bg-transparent
                        p-0
                      "
                    >
                      <div className="relative">
                        <Avatar
                          size={52}
                          src={user.avatar}
                        >
                          {getInitial(user)}
                        </Avatar>

                        <span
                          className="
                            absolute
                            bottom-0
                            right-0
                            h-3.5
                            w-3.5
                            rounded-full
                            border-[2.5px]
                            border-white
                            bg-green-500
                          "
                        />
                      </div>

                      <span
                        className="
                          mt-1
                          w-full
                          truncate
                          text-center
                          text-[11px]
                          text-gray-700
                        "
                      >
                        {getUserName(user)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ================================================= */}
          {/* CONVERSATIONS TITLE */}
          {/* ================================================= */}

          <div className="shrink-0 px-4 pb-1 pt-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Đoạn chat
            </span>
          </div>

          {/* ================================================= */}
          {/* CONVERSATION LIST */}
          {/* ================================================= */}

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2">
            {filteredConversations.length === 0 ? (
              <div className="flex h-full items-center justify-center px-6">
                <Empty
                  image={
                    Empty.PRESENTED_IMAGE_SIMPLE
                  }
                  description={
                    keyword
                      ? "Không tìm thấy cuộc trò chuyện"
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

                  if (!user) {
                    return null;
                  }

                  const userId =
                    getUserId(user);

                  const active =
                    normalizeId(
                      conversation._id,
                    ) ===
                    normalizeId(
                      selectedConversationId,
                    );

                  const online =
                    isUserOnline(userId);

                  const lastMessage =
                    conversation.lastMessage;

                  return (
                    <button
                      key={conversation._id}
                      type="button"
                      onClick={() =>
                        handleSelectConversation(
                          conversation._id,
                        )
                      }
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

                        ${
                          active
                            ? "bg-[#efefef]"
                            : "bg-white hover:bg-[#fafafa]"
                        }
                      `}
                    >
                      {/* AVATAR */}

                      <div className="relative shrink-0">
                        <Avatar
                          size={56}
                          src={user.avatar}
                        >
                          {getInitial(user)}
                        </Avatar>

                        {online && (
                          <span
                            className="
                              absolute
                              bottom-0
                              right-0
                              h-3.5
                              w-3.5
                              rounded-full
                              border-[2.5px]
                              border-white
                              bg-green-500
                            "
                          />
                        )}
                      </div>

                      {/* INFO */}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium text-gray-900">
                            {getUserName(user)}
                          </span>

                          {lastMessage?.createdAt && (
                            <span className="shrink-0 text-[10px] text-gray-400">
                              {formatConversationTime(
                                lastMessage.createdAt,
                              )}
                            </span>
                          )}
                        </div>

                        <p className="m-0 mt-0.5 truncate text-[13px] text-gray-500">
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
        {/* CHAT AREA */}
        {/* ================================================= */}

        <main
          className={`
            relative
            flex
            h-full
            min-h-0
            min-w-0
            flex-1
            flex-col
            overflow-hidden
            bg-white

            ${
              mobileChat
                ? "flex"
                : "hidden lg:flex"
            }
          `}
        >
          {/* ================================================= */}
          {/* EMPTY */}
          {/* ================================================= */}

          {!selectedConversation ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4">
              <div
                className="
                  flex
                  h-24
                  w-24
                  items-center
                  justify-center
                  rounded-full
                  border-2
                  border-gray-900
                "
              >
                <SendOutlinedMirrored />
              </div>

              <p className="m-0 text-xl font-light text-gray-900">
                Tin nhắn của bạn
              </p>

              <p className="m-0 text-sm text-gray-500">
                Chọn một người đang online hoặc một cuộc trò chuyện
              </p>
            </div>
          ) : (
            <>
              {/* ================================================= */}
              {/* CHAT HEADER */}
              {/* ================================================= */}

              <header
                className="
                  z-10
                  flex
                  h-[64px]
                  shrink-0
                  items-center
                  justify-between
                  border-b
                  border-gray-200
                  bg-white
                  px-2
                  sm:px-5
                "
              >
                <div className="flex min-w-0 items-center gap-1.5 sm:gap-2.5">
                  {/* MOBILE BACK */}

                  <Button
                    type="text"
                    icon={
                      <ArrowLeftOutlined />
                    }
                    className="lg:hidden"
                    onClick={handleBack}
                  />

                  {/* AVATAR */}

                  <div className="relative shrink-0">
                    <Avatar
                      size={38}
                      src={otherUser?.avatar}
                    >
                      {getInitial(otherUser)}
                    </Avatar>

                    {isUserOnline(
                      getUserId(otherUser),
                    ) && (
                      <span
                        className="
                          absolute
                          bottom-0
                          right-0
                          h-2.5
                          w-2.5
                          rounded-full
                          border-2
                          border-white
                          bg-green-500
                        "
                      />
                    )}
                  </div>

                  {/* INFO */}

                  <div className="min-w-0">
                    <h2 className="m-0 max-w-[150px] truncate text-sm font-semibold text-gray-900 sm:max-w-none">
                      {getUserName(otherUser)}
                    </h2>

                    <p className="m-0 text-[11px]">
                      {isUserOnline(
                        getUserId(otherUser),
                      ) ? (
                        <span className="text-green-500">
                          Đang hoạt động
                        </span>
                      ) : (
                        <span className="text-gray-400">
                          Ngoại tuyến
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* ACTIONS */}

                <div className="flex shrink-0 items-center gap-0">
                  <Tooltip title="Gọi thoại">
                    <Button
                      type="text"
                      shape="circle"
                      size="large"
                      icon={
                        <PhoneOutlined className="text-lg" />
                      }
                    />
                  </Tooltip>

                  <Tooltip title="Video call">
                    <Button
                      type="text"
                      shape="circle"
                      size="large"
                      icon={
                        <VideoCameraOutlined className="text-lg" />
                      }
                    />
                  </Tooltip>

                  <Tooltip title="Thông tin">
                    <Button
                      type="text"
                      shape="circle"
                      size="large"
                      icon={
                        <InfoCircleOutlined className="text-lg" />
                      }
                    />
                  </Tooltip>

                  <Popconfirm
                    title="Xóa cuộc trò chuyện?"
                    description="Đoạn chat chỉ bị xóa khỏi hộp thư của bạn."
                    okText="Xóa"
                    cancelText="Hủy"
                    okButtonProps={{ danger: true }}
                    onConfirm={handleDeleteConversation}
                  >
                    <Tooltip title="Xóa cuộc trò chuyện">
                      <Button
                        type="text"
                        shape="circle"
                        size="large"
                        danger
                        icon={<DeleteOutlined />}
                        aria-label="Xóa cuộc trò chuyện"
                      />
                    </Tooltip>
                  </Popconfirm>
                </div>
              </header>

              {/* ================================================= */}
              {/* MESSAGES */}
              {/* ================================================= */}

              <div
                ref={messagesContainerRef}
                className="
                  min-h-0
                  min-w-0
                  flex-1
                  overflow-x-hidden
                  overflow-y-auto
                  overscroll-contain
                  bg-white
                  px-3
                  py-4
                  sm:px-6
                "
              >
                <div
                  className="
                    mx-auto
                    flex
                    w-full
                    min-w-0
                    max-w-4xl
                    flex-col
                  "
                >
                  {loadingMessages ? (
                    <div className="flex min-h-[300px] items-center justify-center">
                      <Spin />
                    </div>
                  ) : messages.length === 0 ? (
                    <div
                      className="
                        flex
                        min-h-[400px]
                        flex-col
                        items-center
                        justify-center
                        gap-3
                        px-4
                        text-center
                      "
                    >
                      <Avatar
                        size={80}
                        src={otherUser?.avatar}
                      >
                        {getInitial(otherUser)}
                      </Avatar>

                      <p className="m-0 text-base font-semibold text-gray-900">
                        {getUserName(otherUser)}
                      </p>

                      <p className="m-0 text-sm text-gray-400">
                        Chưa có tin nhắn. Hãy bắt đầu cuộc trò chuyện.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* DATE */}

                      <div className="my-3 text-center">
                        <span className="text-[12px] font-medium text-gray-400">
                          Hôm nay
                        </span>
                      </div>

                      {/* MESSAGE LIST */}

                      {messages.map(
                        (item, index) => {
                          const senderId =
                            getSenderId(item);

                          const isMe =
                            normalizeId(
                              senderId,
                            ) ===
                            currentUserId;

                          const isDeleted = Boolean(item.deletedAt);

                          const seenByOther = isMe && Array.isArray(item.seenBy) && item.seenBy.some(
                            (user) => normalizeId(getUserId(user)) !== currentUserId,
                          );

                          const isLastOwnMessage = isMe && !messages.slice(index + 1).some(
                            (nextItem) => normalizeId(getSenderId(nextItem)) === currentUserId,
                          );

                          const prevItem =
                            messages[
                              index - 1
                            ];

                          const prevSenderId =
                            getSenderId(
                              prevItem,
                            );

                          const sameSender =
                            prevItem &&
                            normalizeId(
                              prevSenderId,
                            ) ===
                              normalizeId(
                                senderId,
                              );

                          return (
                            <div
                              key={
                                item._id ||
                                item.clientMessageId ||
                                `${senderId}-${index}`
                              }
                              className={`
                                flex
                                min-w-0
                                max-w-full
                                items-end
                                gap-2
                                ${
                                  sameSender
                                    ? "mt-0.5"
                                    : "mt-3"
                                }
                                ${
                                  isMe
                                    ? "justify-end"
                                    : "justify-start"
                                }
                              `}
                            >
                              {/* OTHER AVATAR */}

                              {!isMe && (
                                <div className="w-6 shrink-0">
                                  {!sameSender && (
                                    <Avatar
                                      size={24}
                                      src={
                                        item
                                          .senderId
                                          ?.avatar ||
                                        otherUser?.avatar
                                      }
                                    >
                                      {getInitial(
                                        item.senderId ||
                                          otherUser,
                                      )}
                                    </Avatar>
                                  )}
                                </div>
                              )}

                              {/* MESSAGE */}

                                  <div
                                    className={`
                                  group
                                  flex
                                  min-w-0
                                  max-w-[78%]
                                  flex-col
                                  sm:max-w-[65%]
                                  ${
                                    isMe
                                      ? "items-end"
                                      : "items-start"
                                  }
                                `}
                              >
                                <div
                                  className={`
                                    min-w-0
                                    max-w-full
                                    whitespace-pre-wrap
                                    break-words
                                    break-all
                                    overflow-hidden
                                    rounded-[20px]
                                    px-3.5
                                    py-2
                                    text-sm
                                    leading-5

                                    ${
                                      isDeleted
                                        ? "bg-[#efefef] text-gray-500"
                                        : isMe
                                          ? "bg-gradient-to-br from-[#4776E6] to-[#8E54E9] text-white"
                                          : "bg-[#efefef] text-gray-900"
                                    }
                                  `}
                                >
                                  {isDeleted ? (
                                    <span className="italic text-gray-500">
                                      Tin nhắn đã bị xoá
                                    </span>
                                  ) : (
                                    item.content
                                  )}
                                </div>

                                {isLastOwnMessage && seenByOther && !isDeleted && (
                                  <div className="mt-1 flex items-center gap-1 px-1 text-[10px] font-medium text-[#4776E6]">
                                    <CheckCircleFilled className="text-[10px]" />
                                    <span>Đã xem</span>
                                  </div>
                                )}

                                {/* TIME */}

                                <div
                                  className="
                                    mt-0.5
                                    hidden
                                    items-center
                                    gap-1
                                    px-1
                                    text-[10px]
                                    text-gray-400
                                    group-hover:flex
                                  "
                                >
                                  <span>
                                    {formatTime(
                                      item.createdAt,
                                    )}
                                  </span>

                                  {isMe && !isDeleted && (
                                    <Tooltip title={seenByOther ? "Đã xem" : "Đã gửi"}>
                                      <CheckOutlined className={`text-[9px] ${seenByOther ? "text-[#4776E6]" : ""}`} />
                                    </Tooltip>
                                  )}
                                </div>

                                {isMe && !isDeleted && item._id && (
                                  <Popconfirm
                                    title="Xóa tin nhắn này?"
                                    description="Tin nhắn sẽ biến mất với cả hai bên."
                                    okText="Xóa"
                                    cancelText="Hủy"
                                    okButtonProps={{ danger: true }}
                                    onConfirm={() => handleDeleteMessage(item._id)}
                                  >
                                    <Button
                                      type="text"
                                      size="small"
                                      icon={<DeleteOutlined />}
                                      className="mt-0.5 hidden !text-gray-400 group-hover:!inline-flex hover:!text-red-500"
                                      aria-label="Xóa tin nhắn"
                                    />
                                  </Popconfirm>
                                )}
                              </div>
                            </div>
                          );
                        },
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* ================================================= */}
              {/* INPUT */}
              {/* ================================================= */}

              <div
                className="
                  shrink-0
                  bg-white
                  px-3
                  pb-3
                  pt-1
                  sm:px-5
                  sm:pb-4
                "
              >
                <div className="mx-auto w-full min-w-0 max-w-4xl">
                  <div
                    className="
                      flex
                      min-w-0
                      items-center
                      gap-1.5
                      rounded-full
                      border
                      border-gray-300
                      bg-white
                      px-2
                      py-1.5
                    "
                  >
                    {/* EMOJI */}

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

                    {/* INPUT */}

                    <Input.TextArea
                      value={input}
                      onChange={(event) =>
                        setInput(
                          event.target.value,
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
                      className="
                        !min-w-0
                        !resize-none
                        !px-1
                        !py-1
                        text-sm
                      "
                    />

                    {/* FILE */}

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

                    {/* SEND */}

                    {input.trim() ? (
                      <Button
                        type="text"
                        onClick={
                          handleSendMessage
                        }
                        disabled={
                          !socketConnected
                        }
                        className="
                          shrink-0
                          !px-2
                          !font-semibold
                          !text-[#3797f0]
                          disabled:!text-gray-300
                        "
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
// EMPTY STATE ICON
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
      <line
        x1="22"
        y1="2"
        x2="11"
        y2="13"
      />

      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
