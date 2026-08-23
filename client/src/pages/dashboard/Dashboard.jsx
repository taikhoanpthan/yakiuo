import { useCallback, useEffect, useState } from "react";

import {
  Card,
  Empty,
  Spin,
  Tag,
  message,
} from "antd";

import {
  CalendarOutlined,
  MessageOutlined,
  RightOutlined,
  ShopOutlined,
  UserOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";

import { getDashboardStats } from "../../services/dashboardService";

const Dashboard = () => {
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    users: {
      total: 0,
      active: 0,
    },

    feedbacks: {
      total: 0,
    },

    recentFeedbacks: [],
  });

  // =========================
  // CURRENT USER
  // =========================

  const getCurrentUser = () => {
    try {
      return (
        JSON.parse(localStorage.getItem("user")) ||
        JSON.parse(localStorage.getItem("authUser"))
      );
    } catch {
      return null;
    }
  };

  const currentUser = getCurrentUser();

  const isAdmin =
    currentUser?.role === "admin" ||
    currentUser?.role === "ADMIN";

  const userName =
    currentUser?.fullName ||
    currentUser?.username ||
    "bạn";

  // =========================
  // LOAD DASHBOARD
  // =========================

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);

      const response = await getDashboardStats();

      const data =
        response.data?.data ??
        response.data ??
        {};

      setStats({
        users: {
          total: data.users?.total ?? 0,
          active: data.users?.active ?? 0,
        },

        feedbacks: {
          total: data.feedbacks?.total ?? 0,
        },

        recentFeedbacks: Array.isArray(
          data.recentFeedbacks
        )
          ? data.recentFeedbacks
          : [],
      });
    } catch (error) {
      console.error(
        "Load dashboard failed:",
        error
      );

      message.error(
        error.response?.data?.message ||
          "Không thể tải dữ liệu dashboard"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  // =========================
  // FORMAT DATE
  // =========================

  const formatDate = (value) => {
    if (
      !value ||
      !dayjs(value).isValid()
    ) {
      return "—";
    }

    return dayjs(value).format(
      "DD/MM/YYYY"
    );
  };

  const formatTime = (value) => {
    if (
      !value ||
      !dayjs(value).isValid()
    ) {
      return "—";
    }

    return dayjs(value).format(
      "HH:mm"
    );
  };

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="pb-8">
      {/* ==================================================
          HERO
      ================================================== */}

      <div className="relative mb-6 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#172554] via-[#1d4ed8] to-[#3977f6] px-6 py-7 text-white shadow-[0_20px_50px_rgba(37,99,235,0.18)] md:px-8 md:py-8">
        {/* DECORATION */}

        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />

        <div className="pointer-events-none absolute -bottom-24 right-24 h-48 w-48 rounded-full bg-cyan-300/10 blur-3xl" />

        <div className="relative z-10">
          {/* BREADCRUMB */}

          <div className="mb-3 flex items-center gap-2 text-sm text-blue-100">
            <ShopOutlined />

            <span>Yakiuo ERP</span>

            <span className="opacity-50">
              /
            </span>

            <span>Dashboard</span>
          </div>

          {/* TITLE */}

          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Xin chào, {userName} 👋
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100 md:text-[15px]">
            {isAdmin
              ? "Theo dõi tổng quan phản hồi khách hàng và hoạt động của hệ thống."
              : "Theo dõi những phản hồi mới nhất từ khách hàng tại nhà hàng."}
          </p>

          {/* META */}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs backdrop-blur-md">
              <CalendarOutlined />

              {dayjs().format(
                "DD/MM/YYYY"
              )}
            </div>

            <div className="flex items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-2 text-xs text-emerald-100 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />

              Hệ thống đang hoạt động
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================
          STATISTICS
      ================================================== */}

      <div
        className={`mb-6 grid grid-cols-1 gap-4 ${
          isAdmin
            ? "md:grid-cols-2"
            : "md:grid-cols-1"
        }`}
      >
        {/* ==================================================
            FEEDBACK
        ================================================== */}

        <div className="group relative overflow-hidden rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-blue-50 transition group-hover:scale-125" />

          <div className="relative">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-medium text-slate-400">
                  Feedback hiện có
                </div>

                <div className="mt-2 text-4xl font-bold tracking-tight text-slate-800">
                  {stats.feedbacks.total}
                </div>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-xl text-blue-600">
                <MessageOutlined />
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2 text-xs text-slate-400">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 text-blue-500">
                <MessageOutlined />
              </span>

              {isAdmin
                ? "Tổng phản hồi trong hệ thống"
                : "Các phản hồi bạn có quyền xem"}
            </div>
          </div>
        </div>

        {/* ==================================================
            USERS - ADMIN ONLY
        ================================================== */}

        {isAdmin && (
          <div className="group relative overflow-hidden rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-violet-50 transition group-hover:scale-125" />

            <div className="relative">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-400">
                    Tổng số nhân viên
                  </div>

                  <div className="mt-2 text-4xl font-bold tracking-tight text-slate-800">
                    {stats.users.total}
                  </div>
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-xl text-violet-600">
                  <UserOutlined />
                </div>
              </div>

              <div className="mt-5 flex items-center gap-2 text-xs text-slate-400">
                <span className="h-2 w-2 rounded-full bg-violet-500" />

                <span>
                  {stats.users.active} nhân viên đang hoạt động
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ==================================================
          RECENT FEEDBACK
      ================================================== */}

      <Card
        bordered={false}
        className="overflow-hidden rounded-[24px] shadow-sm"
        styles={{
          body: {
            padding: 0,
          },
        }}
      >
        {/* HEADER */}

        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 md:px-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-800">
                Feedback gần đây
              </h2>

              <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-600">
                LIVE
              </span>
            </div>

            <p className="mt-1 text-xs text-slate-400">
              Các phản hồi mới nhất từ khách hàng
            </p>
          </div>

          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
            <RightOutlined />
          </div>
        </div>

        {/* EMPTY */}

        {stats.recentFeedbacks.length ===
        0 ? (
          <div className="px-6 py-16">
            <Empty
              description="Chưa có feedback nào"
            />
          </div>
        ) : (
          /* ==================================================
             FEEDBACK LIST
          ================================================== */

          <div className="divide-y divide-slate-100">
            {stats.recentFeedbacks.map(
              (feedback, index) => (
                <div
                  key={feedback._id}
                  className="group relative px-5 py-5 transition hover:bg-slate-50/70 md:px-6"
                >
                  <div className="flex gap-4">
                    {/* AVATAR */}

                    <div className="relative shrink-0">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                          index === 0
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <UserOutlined />
                      </div>

                      {index ===
                        0 && (
                        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
                      )}
                    </div>

                    {/* CONTENT */}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col justify-between gap-2 sm:flex-row">
                        <div>
                          <h3 className="font-semibold text-slate-800">
                            {feedback.customerName ||
                              "Khách vãng lai"}
                          </h3>

                          <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">
                            {feedback.content ||
                              "Không có nội dung feedback"}
                          </p>
                        </div>

                        {/* DATE */}

                        <div className="shrink-0 text-left sm:text-right">
                          <div className="text-xs font-semibold text-slate-600">
                            {formatDate(
                              feedback.dateTime ||
                                feedback.createdAt
                            )}
                          </div>

                          <div className="mt-1 text-xs text-slate-400">
                            {formatTime(
                              feedback.createdAt
                            )}
                          </div>
                        </div>
                      </div>

                      {/* META */}

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {feedback.meal && (
                          <Tag
                            bordered={false}
                            color="blue"
                            className="m-0 rounded-lg px-2.5 py-1"
                          >
                            {feedback.meal}
                          </Tag>
                        )}

                        {feedback.tableNumber && (
                          <span className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-500">
                            <ShopOutlined />

                            Bàn{" "}
                            {
                              feedback.tableNumber
                            }
                          </span>
                        )}

                        {feedback.createdBy && (
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <UserOutlined />

                            {feedback
                              .createdBy
                              .fullName ||
                              feedback
                                .createdBy
                                .username ||
                              "—"}
                          </span>
                        )}

                        {feedback.tags
                          ?.slice(0, 2)
                          .map(
                            (
                              tag,
                              tagIndex
                            ) => (
                              <span
                                key={`${tag}-${tagIndex}`}
                                className="rounded-lg bg-slate-50 px-2 py-1 text-xs text-slate-400"
                              >
                                #{tag}
                              </span>
                            )
                          )}
                      </div>
                    </div>

                    {/* ARROW */}

                    <div className="hidden items-center text-slate-300 transition group-hover:text-blue-500 sm:flex">
                      <RightOutlined />
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </Card>

      {/* ==================================================
          FOOTER
      ================================================== */}

      <div className="mt-5 text-center text-xs text-slate-400">
        Yakiuo ERP · Customer Feedback Management
      </div>
    </div>
  );
};

export default Dashboard;