import { useCallback, useEffect, useState } from "react";

import { Card, Empty, Image, message } from "antd";

import {
  CalendarOutlined,
  ShopOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";

import { getWorkSchedule } from "../../services/workSchedule.service";
import { connectSocket } from "../../services/socket";
import weeklyCleaningMonThuImage from "../../assets/dashboard/weekly-cleaning-mon-thu.jpg";
import weeklyCleaningFriSunImage from "../../assets/dashboard/weekly-cleaning-fri-sun.jpg";
import HamsterLoader from "../../components/common/HamsterLoader";

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [workSchedule, setWorkSchedule] = useState(null);
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

  const userName = currentUser?.fullName || currentUser?.username || "bạn";

  // =========================
  // LOAD DASHBOARD
  // =========================

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);

      const scheduleResponse = await getWorkSchedule();
      const scheduleData =
        scheduleResponse.data?.data ?? scheduleResponse.data ?? null;

      setWorkSchedule(scheduleData);
    } catch (error) {
      console.error("Load dashboard failed:", error);

      message.error(
        error.response?.data?.message || "Không thể tải dữ liệu dashboard",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  // Nhận lịch mới do Admin/Manager cập nhật mà không cần người dùng tải lại trang.
  useEffect(() => {
    const socket = connectSocket();

    const handleWorkScheduleUpdated = (payload = {}) => {
      setWorkSchedule(payload.data ?? payload ?? null);
    };

    socket.on("work-schedule:updated", handleWorkScheduleUpdated);

    return () => {
      socket.off("work-schedule:updated", handleWorkScheduleUpdated);
    };
  }, []);

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <HamsterLoader size="lg" />
      </div>
    );
  }

  return (
    <div className="pb-8">
      {/* ==================================================
          HERO
      ================================================== */}

      <div className="erp-dashboard-hero relative mb-6 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#172554] via-[#1d4ed8] to-[#3977f6] px-6 py-7 text-white shadow-[0_20px_50px_rgba(37,99,235,0.18)] md:px-8 md:py-8">
        {/* DECORATION */}

        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />

        <div className="pointer-events-none absolute -bottom-24 right-24 h-48 w-48 rounded-full bg-cyan-300/10 blur-3xl" />

        <div className="relative z-10">
          {/* BREADCRUMB */}

          <div className="mb-3 flex items-center gap-2 text-sm text-blue-100">
            <ShopOutlined />

            <span>Yakiuo ERP</span>

            <span className="opacity-50">/</span>

            <span>Dashboard</span>
          </div>

          {/* TITLE */}

          <h1 className="dashboard-greeting m-0 text-2xl font-bold tracking-tight md:text-3xl">
            Xin chào, {userName} 👋
          </h1>


          {/* META */}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs backdrop-blur-md">
              <CalendarOutlined />

              {dayjs().format("DD/MM/YYYY")}
            </div>

            <div className="flex items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-2 text-xs text-emerald-100 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              Hệ thống đang hoạt động
            </div>
          </div>
        </div>
      </div>



 {/* ==================================================
    WORK SCHEDULE
================================================== */}

<Card
  bordered={false}
  className="erp-schedule-card overflow-hidden rounded-[24px] shadow-sm"
  styles={{
    body: {
      padding: 0,
    },
  }}
>
  {/* HEADER */}

  <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-50 text-lg text-purple-600">
        <CalendarOutlined />
      </div>

      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-slate-800">
            Lịch làm việc tuần này
          </h2>

          <span className="rounded-full bg-purple-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-purple-600">
            MỚI NHẤT
          </span>
        </div>

        <p className="mt-1 text-xs text-slate-400">
          Lịch làm việc hiện tại của nhân viên
        </p>
      </div>
    </div>

    {workSchedule?.updatedAt && (
      <div className="text-xs text-slate-400">
        Cập nhật:{" "}
        <span className="font-medium text-slate-600">
          {dayjs(workSchedule.updatedAt).format(
            "DD/MM/YYYY HH:mm"
          )}
        </span>
      </div>
    )}
  </div>

  {/* CONTENT */}

  {workSchedule?.imageUrl ? (
    <div className="bg-slate-50 p-4 md:p-6">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <Image
          src={workSchedule.imageUrl}
          alt="Lịch làm việc tuần này"
          width="100%"
          className="block"
          preview={{
            mask: (
              <div className="text-sm font-medium">
                Xem lịch lớn
              </div>
            ),
          }}
        />
      </div>
    </div>
  ) : (
    <div className="px-6 py-16">
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <div>
            <div className="font-medium text-slate-600">
              Chưa có lịch làm việc
            </div>

            <div className="mt-1 text-xs text-slate-400">
              Quản trị viên chưa cập nhật lịch làm việc.
            </div>
          </div>
        }
      />
    </div>
  )}

  <div className="border-t border-slate-100 bg-slate-50 p-4 md:p-6">
    <h3 className="mb-4 text-base font-bold text-slate-800">
      Công việc hàng tuần
    </h3>

    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <Image
          src={weeklyCleaningMonThuImage}
          alt="Lịch vệ sinh tuần từ thứ 2 đến thứ 5"
          width="100%"
          className="block"
          preview={{
            mask: <div className="text-sm font-medium">Xem ảnh lớn</div>,
          }}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <Image
          src={weeklyCleaningFriSunImage}
          alt="Lịch vệ sinh tuần từ thứ 6 đến Chủ Nhật"
          width="100%"
          className="block"
          preview={{
            mask: <div className="text-sm font-medium">Xem ảnh lớn</div>,
          }}
        />
      </div>
    </div>
  </div>
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
