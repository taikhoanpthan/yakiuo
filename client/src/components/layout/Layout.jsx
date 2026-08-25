import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  Avatar,
  Badge,
  Button,
  Dropdown,
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
  MessageOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";

import { motion } from "framer-motion";
import dayjs from "dayjs";

import { useAuth } from "../../store/AuthContext";
import { getNotifications } from "../../services/notificationService";

const { Content, Header, Sider } = AntLayout;

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const { logout, user } = useAuth();

  // =====================================================
  // STATE
  // =====================================================

  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [notificationLoading, setNotificationLoading] =
    useState(false);

  // =====================================================
  // ROUTE STATE
  // =====================================================

  const isChatPage =
    location.pathname === "/chat" ||
    location.pathname.startsWith("/chat/");

  // =====================================================
  // NOTIFICATION
  // =====================================================

  const [
    notificationApi,
    notificationContextHolder,
  ] = notification.useNotification();

  // =====================================================
  // MENU
  // =====================================================

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
        key: "/chat",
        label: "Tin nhắn",
        shortLabel: "Tin nhắn",
        icon: <MessageOutlined />,
      },
      {
        key: "/todos",
        label: "Todo List",
        shortLabel: "Todo",
        icon: <CheckSquareOutlined />,
      },
    ];

    if (user?.role === "admin") {
      items.splice(1, 0, {
        key: "/users",
        label: "Nhân viên",
        shortLabel: "Nhân viên",
        icon: <TeamOutlined />,
        adminOnly: true,
      });

      items.push({
        key: "/notifications",
        label: "Thông báo",
        shortLabel: "Thông báo",
        icon: <BellOutlined />,
        adminOnly: true,
      });
    }

    return items;
  }, [user?.role]);

  // =====================================================
  // MOBILE MENU
  // =====================================================

  const mobileMenuItems = useMemo(() => {
    const baseItems = [
      "/dashboard",
      "/chat",
      "/todos",
    ];

    if (user?.role === "admin") {
      return [
        "/dashboard",
        "/users",
        "/chat",
        "/todos",
        "/notifications",
      ]
        .map((key) =>
          menuItems.find(
            (item) => item.key === key,
          ),
        )
        .filter(Boolean);
    }

    return baseItems
      .map((key) =>
        menuItems.find(
          (item) => item.key === key,
        ),
      )
      .filter(Boolean);
  }, [menuItems, user?.role]);

  // =====================================================
  // NAVIGATION
  // =====================================================

  const handleNavigate = useCallback(
    (path) => {
      navigate(path);
    },
    [navigate],
  );

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = async () => {
    try {
      await logout();

      message.success(
        "Bạn đã đăng xuất an toàn",
      );

      navigate("/login", {
        replace: true,
      });
    } catch (error) {
      console.error(
        "Logout error:",
        error,
      );

      message.error(
        "Đăng xuất thất bại",
      );
    }
  };

  // =====================================================
  // NOTIFICATION POPUP
  // =====================================================

  const showNotificationPopup =
    useCallback(
      (notificationItem) => {
        if (!notificationItem?._id) {
          return;
        }

        const title =
          notificationItem.title ||
          "Thông báo mới";

        const content =
          notificationItem.content || "";

        notificationApi.open({
          message: (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                paddingRight: 24,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  minWidth: 38,
                  borderRadius: 12,
                  background:
                    "linear-gradient(135deg, #3977f6 0%, #6c9cff 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow:
                    "0 6px 16px rgba(57, 119, 246, 0.25)",
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
                    textTransform:
                      "uppercase",
                    letterSpacing:
                      "0.5px",
                  }}
                >
                  Thông báo mới
                </span>

                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#172033",
                    lineHeight: 1.3,
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
                marginRight: 4,
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
                fontSize: 14,
              }}
            >
              ×
            </span>
          ),

          style: {
            width: 380,
            maxWidth:
              "calc(100vw - 24px)",
            padding: "16px",
            borderRadius: 18,
            background: "#fff",
            border:
              "1px solid #E9EEF7",
            boxShadow:
              "0 18px 45px rgba(16, 24, 40, 0.14), 0 4px 12px rgba(16, 24, 40, 0.06)",
          },

          btn: (
            <div
              style={{
                display: "flex",
                justifyContent:
                  "flex-end",
                marginTop: 8,
              }}
            >
              <Button
                type="text"
                size="small"
                onClick={() =>
                  notificationApi.destroy()
                }
                style={{
                  color: "#667085",
                  fontWeight: 500,
                  borderRadius: 8,
                }}
              >
                Đóng
              </Button>
            </div>
          ),
        });
      },
      [notificationApi],
    );

  // =====================================================
  // LOAD NOTIFICATIONS
  // =====================================================

  const loadNotifications =
    useCallback(
      async (showPopup = false) => {
        try {
          setNotificationLoading(true);

          const response =
            await getNotifications();

          const data =
            response?.data?.data
              ?.notifications || [];

          const list = Array.isArray(data)
            ? data
            : [];

          setNotifications(list);

          if (
            !showPopup ||
            list.length === 0
          ) {
            return;
          }

          const latest = list[0];

          if (!latest?._id) {
            return;
          }

          let shownNotifications = [];

          try {
            shownNotifications =
              JSON.parse(
                localStorage.getItem(
                  "shownNotificationIds",
                ) || "[]",
              );

            if (
              !Array.isArray(
                shownNotifications,
              )
            ) {
              shownNotifications = [];
            }
          } catch {
            shownNotifications = [];
          }

          if (
            shownNotifications.includes(
              latest._id,
            )
          ) {
            return;
          }

          const updatedShownNotifications =
            [
              latest._id,
              ...shownNotifications,
            ].slice(0, 50);

          localStorage.setItem(
            "shownNotificationIds",
            JSON.stringify(
              updatedShownNotifications,
            ),
          );

          showNotificationPopup(
            latest,
          );
        } catch (error) {
          console.error(
            "Load notifications error:",
            error,
          );

          setNotifications([]);
        } finally {
          setNotificationLoading(
            false,
          );
        }
      },
      [showNotificationPopup],
    );

  // =====================================================
  // NOTIFICATION POLLING
  // =====================================================

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    loadNotifications(true);

    const interval = setInterval(
      () => {
        loadNotifications(true);
      },
      10000,
    );

    return () => {
      clearInterval(interval);
    };
  }, [user, loadNotifications]);

  // =====================================================
  // RESPONSIVE
  // =====================================================

  useEffect(() => {
    const mediaQuery =
      window.matchMedia(
        "(max-width: 991px)",
      );

    const handleChange = (event) => {
      setIsMobile(event.matches);

      if (!event.matches) {
        setCollapsed(false);
      }
    };

    setIsMobile(mediaQuery.matches);

    mediaQuery.addEventListener(
      "change",
      handleChange,
    );

    return () => {
      mediaQuery.removeEventListener(
        "change",
        handleChange,
      );
    };
  }, []);

  // =====================================================
  // NOTIFICATION DATA
  // =====================================================

  const recentNotifications =
    notifications.slice(0, 5);

  const notificationCount =
    notifications.length;

  // =====================================================
  // NOTIFICATION POPOVER
  // =====================================================

  const notificationContent = (
    <div
      style={{
        width:
          "min(360px, calc(100vw - 56px))",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          paddingBottom: 12,
          borderBottom:
            "1px solid #f1f5f9",
          marginBottom: 4,
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
            {notificationCount > 0
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
            justifyContent:
              "center",
            padding: "30px 0",
          }}
        >
          <Spin size="small" />
        </div>
      )}

      {!notificationLoading &&
        recentNotifications.length ===
          0 && (
          <Empty
            image={
              Empty.PRESENTED_IMAGE_SIMPLE
            }
            description="Chưa có thông báo"
            style={{
              margin: "25px 0",
            }}
          />
        )}

      {!notificationLoading &&
        recentNotifications.length >
          0 && (
          <div
            style={{
              maxHeight: 400,
              overflowY: "auto",
              overflowX: "hidden",
            }}
          >
            {recentNotifications.map(
              (item) => (
                <div
                  key={item._id}
                  style={{
                    display: "flex",
                    gap: 12,
                    padding: "12px 8px",
                    borderRadius: 8,
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      minWidth: 36,
                      borderRadius:
                        "50%",
                      background:
                        "#f1f5f9",
                      display: "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                    }}
                  >
                    <BellOutlined
                      style={{
                        color:
                          "#3977f6",
                        fontSize: 16,
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
                        color:
                          "#1e293b",
                        overflow:
                          "hidden",
                        textOverflow:
                          "ellipsis",
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      {item.title ||
                        "Thông báo"}
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        color:
                          "#64748b",
                        marginTop: 4,
                        display:
                          "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient:
                          "vertical",
                        overflow:
                          "hidden",
                        wordBreak:
                          "break-word",
                      }}
                    >
                      {item.content ||
                        ""}
                    </div>

                    <div
                      style={{
                        fontSize: 11,
                        color:
                          "#94a3b8",
                        marginTop: 5,
                      }}
                    >
                      {item.createdAt
                        ? dayjs(
                            item.createdAt,
                          ).format(
                            "DD/MM/YYYY HH:mm",
                          )
                        : ""}
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>
        )}
    </div>
  );

  // =====================================================
  // USER MENU
  // =====================================================

  const userMenu = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Tài khoản của tôi",
    },

    ...(user?.role === "admin"
      ? [
          {
            key: "users",
            icon: <TeamOutlined />,
            label:
              "Quản lý nhân viên",
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

  // =====================================================
  // SIDEBAR
  // =====================================================

  const renderNav = () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      {/* BRAND */}

      <div
        className="erp-brand"
        style={{
          flexShrink: 0,
        }}
      >
        <div className="erp-brand-mark">
          Y
        </div>

        {!collapsed && (
          <div>
            <strong>YAKIUO</strong>
            <span>
              ERP WORKSPACE
            </span>
          </div>
        )}
      </div>

      {/* LABEL */}

      {!collapsed && (
        <div
          className="erp-nav-label"
          style={{
            flexShrink: 0,
          }}
        >
          Điều hướng
        </div>
      )}

      {/* MENU */}

      <nav
        className="erp-nav"
        aria-label="Điều hướng chính"
        style={{
          flex: "1 1 auto",
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          paddingBottom: 12,
        }}
      >
        {menuItems.map((item) => {
          const active =
            location.pathname ===
              item.key ||
            location.pathname.startsWith(
              `${item.key}/`,
            );

          return (
            <Tooltip
              key={item.key}
              title={
                collapsed
                  ? item.label
                  : undefined
              }
              placement="right"
            >
              <button
                type="button"
                className={`erp-nav-item ${
                  active
                    ? "is-active"
                    : ""
                }`}
                onClick={() =>
                  handleNavigate(
                    item.key,
                  )
                }
              >
                <span className="erp-nav-icon">
                  {item.icon}
                </span>

                {!collapsed && (
                  <span>
                    {item.label}
                  </span>
                )}
              </button>
            </Tooltip>
          );
        })}
      </nav>

      {/* BOTTOM */}

      <div
        className="erp-side-bottom"
        style={{
          flexShrink: 0,
        }}
      >
        <div className="erp-side-help">
          <SettingOutlined />

          {!collapsed && (
            <span>
              Hệ thống nội bộ
            </span>
          )}
        </div>

        <Tooltip
          title={
            collapsed
              ? "Đăng xuất"
              : undefined
          }
          placement="right"
        >
          <button
            type="button"
            className="erp-logout"
            onClick={handleLogout}
          >
            <LogoutOutlined />

            {!collapsed && (
              <span>Đăng xuất</span>
            )}
          </button>
        </Tooltip>
      </div>
    </div>
  );

  // =====================================================
  // MOBILE TASKBAR
  // =====================================================

  const renderMobileTaskbar = () => {
    if (!isMobile) {
      return null;
    }

    return (
      <nav
        className="erp-mobile-taskbar"
        aria-label="Điều hướng mobile"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,

          width: "100%",
          minHeight: 64,

          paddingTop: 7,
          paddingLeft: 6,
          paddingRight: 6,
          paddingBottom:
            "max(7px, env(safe-area-inset-bottom))",

          display: "flex",
          alignItems: "stretch",

          overflowX: "auto",
          overflowY: "hidden",

          WebkitOverflowScrolling:
            "touch",

          background:
            "rgba(255,255,255,0.96)",
          backdropFilter:
            "blur(20px)",
          WebkitBackdropFilter:
            "blur(20px)",

          borderTop:
            "1px solid rgba(15,23,42,0.08)",

          boxShadow:
            "0 -8px 30px rgba(15,23,42,0.08)",
        }}
      >
        {mobileMenuItems.map(
          (item) => {
            const active =
              location.pathname ===
                item.key ||
              location.pathname.startsWith(
                `${item.key}/`,
              );

            return (
              <button
                key={item.key}
                type="button"
                className={`erp-mobile-task-item ${
                  active
                    ? "is-active"
                    : ""
                }`}
                onClick={() =>
                  handleNavigate(
                    item.key,
                  )
                }
                style={{
                  flex: "1 0 72px",
                  minWidth: 72,
                  minHeight: 50,

                  display: "flex",
                  flexDirection:
                    "column",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",

                  gap: 3,

                  border: 0,
                  background:
                    "transparent",
                  cursor: "pointer",

                  padding:
                    "3px 4px",
                }}
              >
                <span
                  className="erp-mobile-task-icon"
                  style={{
                    display: "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    fontSize: 21,
                    lineHeight: 1,
                  }}
                >
                  {item.icon}
                </span>

                <span
                  className="erp-mobile-task-label"
                  style={{
                    maxWidth: 68,
                    overflow:
                      "hidden",
                    textOverflow:
                      "ellipsis",
                    whiteSpace:
                      "nowrap",
                    fontSize: 10,
                    lineHeight:
                      "14px",
                  }}
                >
                  {item.shortLabel ||
                    item.label}
                </span>
              </button>
            );
          },
        )}

        {/* PROFILE */}

        <button
          type="button"
          className={`erp-mobile-task-item ${
            location.pathname ===
              "/profile" ||
            location.pathname.startsWith(
              "/profile/",
            )
              ? "is-active"
              : ""
          }`}
          onClick={() =>
            handleNavigate(
              "/profile",
            )
          }
          style={{
            flex: "1 0 72px",
            minWidth: 72,
            minHeight: 50,

            display: "flex",
            flexDirection:
              "column",
            alignItems:
              "center",
            justifyContent:
              "center",

            gap: 3,

            border: 0,
            background:
              "transparent",
            cursor: "pointer",

            padding: "3px 4px",
          }}
        >
          <span
            className="erp-mobile-task-avatar"
            style={{
              display: "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              height: 24,
            }}
          >
            <Avatar
              size={24}
              src={
                user?.avatar ||
                undefined
              }
              icon={
                !user?.avatar && (
                  <UserOutlined />
                )
              }
            >
              {!user?.avatar &&
                (
                  user?.fullName?.charAt(
                    0,
                  ) || "Y"
                ).toUpperCase()}
            </Avatar>
          </span>

          <span
            className="erp-mobile-task-label"
            style={{
              fontSize: 10,
              lineHeight:
                "14px",
            }}
          >
            Tôi
          </span>
        </button>
      </nav>
    );
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <>
      {notificationContextHolder}

      <AntLayout
        className="erp-shell"
        style={{
          width: "100%",
          height: "100dvh",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {/* =================================================
            DESKTOP SIDEBAR
        ================================================= */}

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
          zeroWidthTriggerStyle={{
            display: "none",
          }}
          style={{
            height: "100dvh",
            maxHeight: "100dvh",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {renderNav()}
        </Sider>

        {/* MOBILE TASKBAR */}

        {renderMobileTaskbar()}

        {/* =================================================
            WORKSPACE
        ================================================= */}

        <AntLayout
          className="erp-workspace"
          style={{
            flex: "1 1 auto",
            minWidth: 0,
            minHeight: 0,
            height: "100dvh",
            overflow: "hidden",
          }}
        >
          {/* =================================================
              HEADER
          ================================================= */}

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
            {/* LEFT */}

            <Space size={12}>
              <Button
                type="text"
                className="erp-menu-button"
                aria-label="Mở menu"
                icon={
                  collapsed ||
                  isMobile ? (
                    <MenuUnfoldOutlined />
                  ) : (
                    <MenuFoldOutlined />
                  )
                }
                onClick={() => {
                  if (isMobile) {
                    return;
                  }

                  setCollapsed(
                    (value) =>
                      !value,
                  );
                }}
              />

              <div className="erp-header-context">
                <span>
                  Không gian làm việc
                </span>

                <strong>
                  Yakiuo ERP
                </strong>
              </div>
            </Space>

            {/* RIGHT */}

            <Space size={16}>
              {/* NOTIFICATION */}

              <Popover
                trigger="click"
                placement="bottomRight"
                arrow={false}
                content={
                  notificationContent
                }
                align={{
                  offset: [40, 8],
                }}
                styles={{
                  root: {
                    maxWidth:
                      "calc(100vw - 24px)",
                  },
                }}
              >
                <Tooltip title="Thông báo">
                  <Badge
                    count={
                      notificationCount
                    }
                    overflowCount={99}
                    size="small"
                    offset={[-3, 5]}
                  >
                    <Button
                      type="text"
                      className="erp-menu-button"
                      icon={
                        <BellOutlined />
                      }
                      aria-label="Thông báo"
                    />
                  </Badge>
                </Tooltip>
              </Popover>

              {/* USER */}

              <Dropdown
                placement="bottomRight"
                menu={{
                  items: userMenu,

                  onClick: ({
                    key,
                  }) => {
                    if (
                      key ===
                      "profile"
                    ) {
                      navigate(
                        "/profile",
                      );
                    }

                    if (
                      key === "users"
                    ) {
                      navigate(
                        "/users",
                      );
                    }

                    if (
                      key ===
                      "logout"
                    ) {
                      handleLogout();
                    }
                  },
                }}
              >
                <button
                  type="button"
                  className="erp-user-menu"
                >
                  <Avatar
                    className="erp-avatar"
                    src={
                      user?.avatar ||
                      undefined
                    }
                    icon={
                      !user?.avatar && (
                        <UserOutlined />
                      )
                    }
                  >
                    {!user?.avatar &&
                      (
                        user?.fullName?.charAt(
                          0,
                        ) || "Y"
                      ).toUpperCase()}
                  </Avatar>

                  <span className="erp-user-copy">
                    <strong>
                      {user?.fullName ||
                        "Người dùng"}
                    </strong>

                    <small>
                      {user?.role ===
                      "admin"
                        ? "Quản trị viên"
                        : "Nhân viên"}
                    </small>
                  </span>
                </button>
              </Dropdown>
            </Space>
          </Header>

          {/* =================================================
              CONTENT
          ================================================= */}

          <Content
            className={`erp-content ${
              isChatPage
                ? "erp-content-chat"
                : ""
            }`}
            style={{
              flex: "1 1 auto",
              minHeight: 0,
              minWidth: 0,

              /*
               * CHAT:
               * Không cho Content scroll.
               * ChatPage tự quản lý scroll.
               */
              overflowY: isChatPage
                ? "hidden"
                : "auto",

              overflowX: "hidden",

              WebkitOverflowScrolling:
                "touch",

              /*
               * Các page bình thường phải
               * chừa taskbar mobile.
               *
               * ChatPage tự chừa taskbar
               * nên Content không cộng thêm.
               */
              paddingBottom:
                isMobile && !isChatPage
                  ? "calc(82px + env(safe-area-inset-bottom))"
                  : 0,
            }}
          >
            <motion.main
              key={location.pathname}
              className={`erp-page ${
                isChatPage
                  ? "erp-page-chat"
                  : ""
              }`}
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
                ease: "easeOut",
              }}
              style={{
                minWidth: 0,

                /*
                 * CHAT:
                 * Bắt buộc wrapper phải có
                 * chiều cao thực tế để
                 * flex bên trong hoạt động.
                 */
                ...(isChatPage
                  ? {
                      height: "100%",
                      minHeight: 0,
                      overflow: "hidden",
                      display: "flex",
                      flexDirection:
                        "column",
                    }
                  : {
                      minHeight: "100%",
                      height: "auto",
                    }),
              }}
            >
              {children}
            </motion.main>

            {/* =================================================
                FOOTER
            ================================================= */}

            {!isChatPage && (
              <footer className="erp-footer">
                <div className="erp-footer-left">
                  <div className="erp-footer-brand">
                    <span className="erp-footer-mark"></span>

                    <div>
                      <strong>
                        YAKIUO ISHIKAWA
                      </strong>

                      <span>
                        ERP WORKSPACE
                      </span>
                    </div>
                  </div>
                </div>

                <div className="erp-footer-center">
                  <span className="erp-footer-dot" />

                  <span>
                    Developed by{" "}
                    <strong>
                      My
                    </strong>
                  </span>
                </div>

                <div className="erp-footer-right">
                  <span>
                    ©{" "}
                    {new Date().getFullYear()}
                  </span>

                  <span className="erp-footer-divider" />

                  <span>
                    v1.0.0
                  </span>
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