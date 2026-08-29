import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Avatar,
  Badge,
  Button,
  Dropdown,
  Drawer,
  Empty,
  Layout as AntLayout,
  Popover,
  Space,
  Spin,
  Tooltip,
  message,
  notification,
} from "antd";

import {
  AppstoreOutlined,
  BellOutlined,
  CheckSquareOutlined,
  CommentOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";

import { useLocation, useNavigate } from "react-router-dom";

import { motion } from "framer-motion";

import dayjs from "dayjs";

import { useAuth } from "../../store/AuthContext";

import { getNotifications } from "../../services/notificationService";

import { onOnlineUsers } from "../../services/socket";
import MobileTaskbar from "./MobileTaskbar";
import DesktopSidebar from "./DesktopSidebar";

const { Content, Header, Sider } = AntLayout;

// =====================================================
// LAYOUT
// =====================================================

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const { logout, user } = useAuth();

  // ===================================================
  // STATE
  // ===================================================

  const [collapsed, setCollapsed] = useState(false);

  const [isMobile, setIsMobile] = useState(false);

  const [notifications, setNotifications] = useState([]);

  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);

  // ===================================================
  // REALTIME ONLINE COUNT
  //
  // QUAN TRỌNG:
  //
  // Không lấy User.length
  // Không gọi API users
  // Không tự cộng/trừ
  //
  // Server Socket.IO là source of truth.
  // ===================================================

  const [onlineCount, setOnlineCount] = useState(0);

  // ===================================================
  // NOTIFICATION
  // ===================================================

  const [notificationApi, notificationContextHolder] =
    notification.useNotification();

  // ===================================================
  // CHAT PAGE
  // ===================================================

  const isChatPage =
    location.pathname === "/chat" || location.pathname.startsWith("/chat/");

  // Safari iOS không luôn cập nhật 100dvh đúng lúc bàn phím mở.
  // Dùng visualViewport để khung chat luôn nằm trong phần màn hình đang thấy.
  useEffect(() => {
    const viewport = window.visualViewport;

    const syncViewportHeight = () => {
      const viewportHeight =
        viewport?.height || window.innerHeight;

      document.documentElement.style.setProperty(
        "--erp-viewport-height",
        `${viewportHeight}px`,
      );

      // iOS giữ layout viewport ở chiều cao cũ khi bàn phím mở. Khoảng lệch
      // này giúp các phần tử fixed (khung soạn tin) nằm sát phía trên bàn phím.
      document.documentElement.style.setProperty(
        "--erp-keyboard-offset",
        `${Math.max(
          0,
          window.innerHeight - viewportHeight - (viewport?.offsetTop || 0),
        )}px`,
      );
    };

    syncViewportHeight();
    viewport?.addEventListener("resize", syncViewportHeight);
    window.addEventListener("resize", syncViewportHeight);

    return () => {
      viewport?.removeEventListener("resize", syncViewportHeight);
      window.removeEventListener("resize", syncViewportHeight);
      document.documentElement.style.removeProperty("--erp-viewport-height");
      document.documentElement.style.removeProperty("--erp-keyboard-offset");
    };
  }, []);

  // ===================================================
  // MENU
  // ===================================================

  const menuItems = useMemo(() => {
    const items = [
      {
        key: "/dashboard",
        label: "Trang chủ",
        shortLabel: "Trang chủ",
        icon: <AppstoreOutlined />,
      },

      {
        key: "/feedback",
        label: "Feedback",
        shortLabel: "Feedback",
        icon: <CommentOutlined />,
      },

      {
        key: "/todos",
        label: "Todo List",
        shortLabel: "Todo",
        icon: <CheckSquareOutlined />,
      },
    ];

    // ADMIN + MANAGER: đều có thể xem nhân viên và quản lý thông báo.
    if (["admin", "manager"].includes(user?.role)) {
      items.splice(1, 0, {
        key: "/users",
        label: "Nhân viên",
        shortLabel: "Nhân viên",
        icon: <TeamOutlined />,
      });

      items.push({
        key: "/notifications",
        label: "Thông báo",
        shortLabel: "Thông báo",
        icon: <BellOutlined />,
      });
    }

    return items;
  }, [user?.role]);

  // ===================================================
  // MOBILE MENU
  // ===================================================

  const mobileMenuItems = useMemo(() => {
    // Các trang quản trị (như Nhân viên) nằm trong menu tài khoản trên header
    // để taskbar điện thoại luôn gọn và dễ bấm.
    const keys = ["/dashboard", "/feedback", "/todos"];

    if (["admin", "manager"].includes(user?.role)) {
      keys.push("/notifications");
    }

    return keys
      .map((key) => menuItems.find((item) => item.key === key))
      .filter(Boolean);
  }, [menuItems, user?.role]);

  const mobileTaskbarItems = useMemo(
    () => [
      ...mobileMenuItems,
      {
        key: "/profile",
        label: "Tôi",
        shortLabel: "Tôi",
        user,
      },
    ],
    [mobileMenuItems, user],
  );

  // ===================================================
  // NAVIGATION
  // ===================================================

  const handleNavigate = useCallback(
    (path) => {
      navigate(path);
    },
    [navigate],
  );

  // ===================================================
  // LOGOUT
  // ===================================================

  const handleLogout = useCallback(async () => {
    try {
      console.log("🚪 LOGOUT USER:", user?._id);

      await logout();

      setOnlineCount(0);

      message.success("Bạn đã đăng xuất an toàn");

      navigate("/login", {
        replace: true,
      });
    } catch (error) {
      console.error("❌ Logout error:", error);

      message.error("Đăng xuất thất bại");
    }
  }, [logout, navigate, user?._id]);

  // ===================================================
  // REALTIME PRESENCE
  //
  // Layout chịu trách nhiệm:
  //
  // USER LOGIN
  //      ↓
  // setSocketUser(user._id)
  //      ↓
  // Socket.IO
  //      ↓
  // user:join
  //
  // Server trả:
  //
  // users:online
  //
  // Layout chỉ nghe event.
  //
  // KHÔNG QUERY DATABASE.
  // KHÔNG POLLING.
  // ===================================================
  useEffect(() => {
    if (!user?._id) {
      setOnlineCount(0);
      return;
    }

    console.log("👂 LISTEN REALTIME PRESENCE FOR:", user._id);

    const unsubscribeUsers = onOnlineUsers((payload) => {
      console.log("👥 REALTIME ONLINE USERS:", payload);

      const userIds = Array.isArray(payload?.userIds) ? payload.userIds : [];

      const count = Number(payload?.count ?? userIds.length);

      setOnlineCount(Number.isFinite(count) ? count : userIds.length);
    });

    return () => {
      console.log("👋 STOP LISTENING PRESENCE:", user._id);

      unsubscribeUsers();
    };
  }, [user?._id]);
  // ===================================================
  // NOTIFICATION POPUP
  // ===================================================

  const showNotificationPopup = useCallback(
    (notificationItem) => {
      if (!notificationItem?._id) {
        return;
      }

      const title = notificationItem.title || "Thông báo mới";

      const content = notificationItem.content || "";

      notificationApi.open({
        message: (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                minWidth: 38,
                borderRadius: 12,
                background: "linear-gradient(135deg, #3977f6 0%, #6c9cff 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <BellOutlined
                style={{
                  color: "#fff",
                  fontSize: 18,
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#3977f6",
                  textTransform: "uppercase",
                }}
              >
                Thông báo mới
              </span>

              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#172033",
                }}
              >
                {title}
              </span>
            </div>
          </div>
        ),

        description: (
          <div
            style={{
              marginTop: 10,
              marginLeft: 48,
              color: "#667085",
              fontSize: 13,
              lineHeight: 1.6,
              wordBreak: "break-word",
            }}
          >
            {content}
          </div>
        ),

        placement: "topRight",

        duration: 5,

        closeIcon: (
          <span
            style={{
              color: "#98A2B3",
            }}
          >
            ×
          </span>
        ),

        style: {
          width: 380,
          maxWidth: "calc(100vw - 24px)",
          marginRight: 12,
          padding: 16,
          borderRadius: 18,
          background: "#fff",
          border: "1px solid #E9EEF7",
          boxShadow: "0 18px 45px rgba(16,24,40,.14)",
        },
      });
    },
    [notificationApi],
  );

  // ===================================================
  // LOAD NOTIFICATIONS
  // ===================================================

  const loadNotifications = useCallback(
    async (showPopup = false) => {
      try {
        setNotificationLoading(true);

        const response = await getNotifications();

        const data = response?.data?.data?.notifications || [];

        const list = Array.isArray(data) ? data : [];

        setNotifications(list);

        if (!showPopup || list.length === 0) {
          return;
        }

        const latest = list[0];

        if (!latest?._id) {
          return;
        }

        let shownIds = [];

        try {
          shownIds = JSON.parse(
            localStorage.getItem("shownNotificationIds") || "[]",
          );

          if (!Array.isArray(shownIds)) {
            shownIds = [];
          }
        } catch {
          shownIds = [];
        }

        if (shownIds.includes(latest._id)) {
          return;
        }

        localStorage.setItem(
          "shownNotificationIds",
          JSON.stringify([latest._id, ...shownIds].slice(0, 50)),
        );

        showNotificationPopup(latest);
      } catch (error) {
        console.error("❌ Load notifications error:", error);

        setNotifications([]);
      } finally {
        setNotificationLoading(false);
      }
    },
    [showNotificationPopup],
  );

  // ===================================================
  // NOTIFICATION POLLING
  // ===================================================

  useEffect(() => {
    if (!user?._id) {
      setNotifications([]);

      return;
    }

    loadNotifications(true);

    const interval = setInterval(() => {
      loadNotifications(true);
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [user?._id, loadNotifications]);

  // ===================================================
  // RESPONSIVE
  // ===================================================

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 991px)");

    const handleChange = (event) => {
      setIsMobile(event.matches);

      if (!event.matches) {
        setCollapsed(false);
      }
    };

    setIsMobile(mediaQuery.matches);

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  // Khi iOS mở bàn phím, visual viewport thay đổi sau sự kiện focus một nhịp.
  // Đưa ô đang nhập vào vùng nhìn thấy để không tạo một khoảng trống lớn phía
  // dưới form và tránh việc người dùng phải cuộn lại để tiếp tục nhập.
  useEffect(() => {
    const scrollFocusedFieldIntoView = (event) => {
      if (!window.matchMedia("(max-width: 991px)").matches) return;

      const field = event.target;
      if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) return;

      window.setTimeout(() => {
        field.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 250);
    };

    document.addEventListener("focusin", scrollFocusedFieldIntoView);
    return () => document.removeEventListener("focusin", scrollFocusedFieldIntoView);
  }, []);

  // ===================================================
  // NOTIFICATION DATA
  // ===================================================

  const recentNotifications = notifications.slice(0, 5);

  const notificationCount = notifications.length;

  // ===================================================
  // NOTIFICATION CONTENT
  // ===================================================

  const notificationContent = (
    <div
      style={{
        width: "min(360px, calc(100vw - 56px))",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingBottom: 12,
          borderBottom: "1px solid #f1f5f9",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "#0f172a",
            }}
          >
            Thông báo
          </div>

          <div
            style={{
              fontSize: 12,
              color: "#94a3b8",
              marginTop: 2,
            }}
          >
            {notificationCount
              ? `${notificationCount} thông báo`
              : "Không có thông báo mới"}
          </div>
        </div>

        <BellOutlined
          style={{
            fontSize: 18,
            color: "#64748b",
          }}
        />
      </div>

      {notificationLoading && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: 30,
          }}
        >
          <Spin size="small" />
        </div>
      )}

      {!notificationLoading && recentNotifications.length === 0 && (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Chưa có thông báo"
          style={{
            margin: "25px 0",
          }}
        />
      )}

      {!notificationLoading && recentNotifications.length > 0 && (
        <div
          className="erp-notification-list"
          style={{
            maxHeight: "min(520px, calc(100dvh - 180px))",
            overflowY: "auto",
          }}
        >
          {recentNotifications.map((item) => (
            <div
              key={item._id}
              style={{
                display: "flex",
                gap: 12,
                padding: "12px 8px",
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  minWidth: 36,
                  borderRadius: "50%",
                  background: "#f1f5f9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <BellOutlined
                  style={{
                    color: "#3977f6",
                  }}
                />
              </div>

              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#1e293b",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.title || "Thông báo"}
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: "#64748b",
                    marginTop: 4,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {item.content || ""}
                </div>

                <div
                  style={{
                    fontSize: 11,
                    color: "#94a3b8",
                    marginTop: 5,
                  }}
                >
                  {item.createdAt
                    ? dayjs(item.createdAt).format("DD/MM/YYYY HH:mm")
                    : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ===================================================
  // USER MENU
  // ===================================================

  const userMenu = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Tài khoản của tôi",
    },

    ...(["admin", "manager"].includes(user?.role)
      ? [
          {
            key: "users",
            icon: <TeamOutlined />,
            label: "Quản lý nhân viên",
          },
        ]
      : []),

    {
      type: "divider",
    },

    {
      key: "logout",
      icon: <LogoutOutlined />,
      danger: true,
      label: "Đăng xuất",
    },
  ];

  // ===================================================
  // SIDEBAR
  // ===================================================

  const renderNav = () => (
    <DesktopSidebar
      collapsed={collapsed}
      items={menuItems}
      pathname={location.pathname}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
    />
  );

  // ===================================================
  // MOBILE TASKBAR
  // ===================================================

  const renderMobileTaskbar = () => {
    if (!isMobile || isChatPage) {
      return null;
    }

    return (
      <MobileTaskbar
        items={mobileTaskbarItems}
        pathname={location.pathname}
        onNavigate={handleNavigate}
      />
    );
  };

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <>
      {notificationContextHolder}

      <AntLayout
        className="erp-shell"
        style={{
          width: "100%",
          height: "var(--erp-viewport-height, 100dvh)",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {/* =============================================
            SIDEBAR
        ============================================= */}

        <Sider
          className="erp-sider"
          collapsed={collapsed}
          collapsedWidth={76}
          width={264}
          trigger={null}
          breakpoint="lg"
          onBreakpoint={(broken) => {
            setIsMobile(broken);

            if (broken) {
              setCollapsed(false);
            }
          }}
          style={{
            height: "var(--erp-viewport-height, 100dvh)",
            maxHeight: "var(--erp-viewport-height, 100dvh)",
            overflow: "hidden",
          }}
        >
          {renderNav()}
        </Sider>

        {renderMobileTaskbar()}

        {/* =============================================
            WORKSPACE
        ============================================= */}

        <AntLayout
          className="erp-workspace"
          style={{
            flex: "1 1 auto",
            minWidth: 0,
            minHeight: 0,
            height: "var(--erp-viewport-height, 100dvh)",
            overflow: "hidden",
          }}
        >
          {/* ===========================================
              HEADER
          =========================================== */}

          <Header
            className="erp-header"
            style={{
              position: "relative",
              zIndex: 100,
              flex: "0 0 64px",
              height: 64,
              minHeight: 64,
              lineHeight: "64px",
              padding: 0,
            }}
          >
            <Space size={12}>
              <Button
                type="text"
                className="erp-menu-button"
                aria-label="Mở menu"
                icon={
                  collapsed || isMobile ? (
                    <MenuUnfoldOutlined />
                  ) : (
                    <MenuFoldOutlined />
                  )
                }
                onClick={() => {
                  if (isMobile) {
                    return;
                  }

                  setCollapsed((value) => !value);
                }}
              />

              <div className="erp-header-context">
                <span>Không gian làm việc</span>

                <strong>Yakiuo ERP</strong>
              </div>
            </Space>

            {/* =========================================
                RIGHT
            ========================================= */}

            <Space size={16}>
              {/* =======================================
                  REALTIME ONLINE
              ======================================= */}

              <Tooltip title={`${onlineCount} người đang online`}>
                <div
                  className="erp-online-indicator"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    height: 36,
                    padding: "0 11px",
                    borderRadius: 12,
                    background: "#f0fdf4",
                    border: "1px solid #dcfce7",
                    color: "#166534",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      minWidth: 9,
                      borderRadius: "50%",
                      background: onlineCount > 0 ? "#22c55e" : "#94a3b8",
                      boxShadow:
                        onlineCount > 0
                          ? "0 0 0 3px rgba(34,197,94,.12)"
                          : "none",
                    }}
                  />

                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {onlineCount}
                  </span>

                  <span
                    className="erp-online-label"
                    style={{
                      fontSize: 12,
                      color: "#4b5563",
                    }}
                  >
                    đang online
                  </span>
                </div>
              </Tooltip>

              {/* =======================================
                  NOTIFICATION
              ======================================= */}

              {isMobile ? (
                <>
                  <Tooltip title="Thông báo">
                    <Badge count={notificationCount} overflowCount={99} size="small" offset={[-4, 4]}>
                      <Button
                        type="text"
                        className="erp-menu-button"
                        icon={<BellOutlined />}
                        onClick={() => setNotificationDrawerOpen(true)}
                      />
                    </Badge>
                  </Tooltip>

                  <Drawer
                    title="Thông báo"
                    placement="bottom"
                    height="min(78dvh, 680px)"
                    open={notificationDrawerOpen}
                    onClose={() => setNotificationDrawerOpen(false)}
                    className="erp-mobile-notification-drawer"
                  >
                    {notificationContent}
                  </Drawer>
                </>
              ) : (
                <Popover
                  trigger="click"
                  placement="bottomRight"
                  arrow={false}
                  content={notificationContent}
                  styles={{ root: { maxWidth: "calc(100vw - 24px)" } }}
                >
                  <Tooltip title="Thông báo">
                    <Badge count={notificationCount} overflowCount={99} size="small" offset={[-4, 4]}>
                      <Button type="text" className="erp-menu-button" icon={<BellOutlined />} />
                    </Badge>
                  </Tooltip>
                </Popover>
              )}

              {/* =======================================
                  USER
              ======================================= */}

              <Dropdown
                placement="bottomRight"
                menu={{
                  items: userMenu,

                  onClick: ({ key }) => {
                    if (key === "profile") {
                      navigate("/profile");
                    }

                    if (key === "users") {
                      navigate("/users");
                    }

                    if (key === "logout") {
                      handleLogout();
                    }
                  },
                }}
              >
                <button type="button" className="erp-user-menu">
                  <Avatar
                    className="erp-avatar"
                    src={user?.avatar || undefined}
                    icon={!user?.avatar && <UserOutlined />}
                  >
                    {!user?.avatar &&
                      (user?.fullName?.charAt(0) || "Y").toUpperCase()}
                  </Avatar>

                  <span className="erp-user-copy">
                    <strong>{user?.fullName || "Người dùng"}</strong>

                    <small>
                      {user?.role === "admin"
                        ? "Quản trị viên"
                        : user?.role === "manager"
                          ? "Quản lý"
                          : "Nhân viên"}
                    </small>
                  </span>
                </button>
              </Dropdown>
            </Space>
          </Header>

          {/* ===========================================
              CONTENT
          =========================================== */}

          <Content
            className={`erp-content ${isChatPage ? "erp-content-chat" : ""}`}
            style={{
              flex: "1 1 auto",
              minHeight: 0,
              minWidth: 0,
              overflowY: isChatPage ? "hidden" : "auto",
              overflowX: "hidden",
              WebkitOverflowScrolling: "touch",
              paddingBottom:
                isMobile && !isChatPage
                  ? "calc(76px + env(safe-area-inset-bottom))"
                  : 0,
            }}
          >
            <motion.main
              key={location.pathname}
              className={`erp-page ${isChatPage ? "erp-page-chat" : ""}`}
              initial={{
                opacity: 0,
                y: 8,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.24,
              }}
              style={{
                minWidth: 0,

                ...(isChatPage
                  ? {
                      height: "100%",
                      minHeight: 0,
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                    }
                  : {
                      minHeight: "100%",
                    }),
              }}
            >
              {children}
            </motion.main>

            {!isChatPage && (
              <footer className="erp-footer">
                <div className="erp-footer-left">
                  <div className="erp-footer-brand">
                    <span className="erp-footer-mark" />

                    <div>
                      <strong>YAKIUO ISHIKAWA</strong>

                      <span>ERP WORKSPACE</span>
                    </div>
                  </div>
                </div>

                <div className="erp-footer-center">
                  <span className="erp-footer-dot" />

                  <span>
                    Developed by <strong>My</strong>
                  </span>
                </div>

                <div className="erp-footer-right">
                  <span>© {new Date().getFullYear()}</span>

                  <span className="erp-footer-divider" />

                  <span>v1.0.0</span>
                </div>
              </footer>
            )}
          </Content>
        </AntLayout>
      </AntLayout>
    </>
  );
};

export default Layout;
