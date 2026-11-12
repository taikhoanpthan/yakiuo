import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Button, Card, Carousel, Image, Modal, message } from "antd";

import {
  CalendarOutlined,
  ReloadOutlined,
  ShopOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";

import { getPreviousWorkSchedule, getWorkSchedule, getWorkSchedules } from "../../services/workSchedule.service";
import { connectSocket, onSocketConnected } from "../../services/socket";
import weeklyCleaningMonThuImage from "../../assets/dashboard/weekly-cleaning-mon-thu.jpg";
import weeklyCleaningFriSunImage from "../../assets/dashboard/weekly-cleaning-fri-sun.jpg";
import HamsterLoader from "../../components/common/HamsterLoader";

const Dashboard = () => {
  const [previousSchedule, setPreviousSchedule] = useState(null);
  const [previousScheduleOpen, setPreviousScheduleOpen] = useState(false);
  const [previousScheduleLoading, setPreviousScheduleLoading] = useState(false);

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

  const queryClient = useQueryClient();
  const { data: dashboardData = { schedule: null, slides: [] }, isLoading: loading } = useQuery({
    queryKey: ["dashboard", "schedule-and-slides"],
    queryFn: async () => {
      const [scheduleResponse, slidesResponse] = await Promise.all([getWorkSchedule(), getWorkSchedules()]);
      const schedule = scheduleResponse.data?.data ?? scheduleResponse.data ?? null;
      const slides = slidesResponse.data?.data ?? slidesResponse.data ?? [];
      return { schedule, slides: Array.isArray(slides) ? slides : [] };
    },
  });

  // Nhận lịch mới do Admin/Manager cập nhật mà không cần người dùng tải lại trang.
  useEffect(() => {
    const socket = connectSocket();

    const handleWorkScheduleUpdated = () => queryClient.invalidateQueries({
      queryKey: ["dashboard", "schedule-and-slides"],
      refetchType: "active",
    });

    socket.on("work-schedule:updated", handleWorkScheduleUpdated);
    socket.on("dashboard-slides:updated", handleWorkScheduleUpdated);

    const unsubscribeConnected = onSocketConnected(() => {
      queryClient.invalidateQueries({
        queryKey: ["dashboard", "schedule-and-slides"],
        refetchType: "active",
      });
    });

    return () => {
      socket.off("work-schedule:updated", handleWorkScheduleUpdated);
      socket.off("dashboard-slides:updated", handleWorkScheduleUpdated);
      unsubscribeConnected();
    };
  }, [queryClient]);

  const viewPreviousSchedule = async () => {
    try {
      setPreviousScheduleLoading(true);
      const response = await getPreviousWorkSchedule();
      const schedule = response.data?.data ?? null;
      if (!schedule) return message.info("Chưa có lịch tuần trước để xem");
      setPreviousSchedule(schedule);
      setPreviousScheduleOpen(true);
    } catch (error) {
      message.error(error.response?.data?.message || "Không thể tải lịch tuần trước");
    } finally {
      setPreviousScheduleLoading(false);
    }
  };

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

  const latestSchedule = dashboardData.schedule;
  const dashboardImages = dashboardData.slides;

  const dashboardSlides = [
    ...(latestSchedule?.imageUrl ? [{
      src: latestSchedule.imageUrl,
      alt: "Lịch làm việc tuần này",
      title: "Lịch làm việc tuần này",
      description: latestSchedule.updatedAt
        ? `Cập nhật ${dayjs(latestSchedule.updatedAt).format("DD/MM/YYYY HH:mm")}`
        : "Lịch làm việc hiện tại",
    }] : []),
    ...dashboardImages.map((schedule, index) => ({
      src: schedule.imageUrl,
      // alt: `Ảnh trình chiếu ${index + 1}`,
      // title: `Ảnh trình chiếu ${index + 1}`,
      description: schedule.updatedAt
        ? `Cập nhật ${dayjs(schedule.updatedAt).format("DD/MM/YYYY HH:mm")}`
        : "Ảnh Dashboard",
    })),
    {
      src: weeklyCleaningMonThuImage,
      alt: "Lịch vệ sinh tuần từ thứ 2 đến thứ 5",
      title: "Công việc thứ 2 – thứ 5",
      description: "Lịch vệ sinh đầu tuần",
    },
    {
      src: weeklyCleaningFriSunImage,
      alt: "Lịch vệ sinh tuần từ thứ 6 đến Chủ Nhật",
      title: "Công việc thứ 6 – Chủ Nhật",
      description: "Lịch vệ sinh cuối tuần",
    },
  ];

  return (
    <div className="pb-8">
      {/* ==================================================
          HERO
      ================================================== */}

      <div className="erp-dashboard-hero relative mb-6 overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-50 via-white to-slate-100 px-6 py-7 text-slate-800 shadow-[0_20px_50px_rgba(15,23,42,0.08)] md:px-8 md:py-8">
        {/* DECORATION */}

        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-slate-900/5 blur-2xl" />

        <div className="pointer-events-none absolute -bottom-24 right-24 h-48 w-48 rounded-full bg-slate-400/10 blur-3xl" />

        <div className="relative z-10">
          {/* BREADCRUMB */}

          <div className="mb-3 flex items-center gap-2 text-sm text-slate-500">
            <ShopOutlined />

            <span>Yakiuo ERP</span>

            <span className="opacity-50">/</span>

            <span>Dashboard</span>
          </div>

          {/* TITLE */}

          <h1 className="dashboard-greeting dashboard-greeting--reveal m-0 text-2xl font-bold tracking-tight text-slate-800 md:text-3xl">
            Xin chào, {userName}
          </h1>


          {/* META */}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-slate-900/5 px-3 py-2 text-xs backdrop-blur-md">
              <CalendarOutlined />

              {dayjs().format("DD/MM/YYYY")}
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

    <Button icon={<ReloadOutlined />} loading={previousScheduleLoading} onClick={viewPreviousSchedule}>
      Xem tuần trước
    </Button>

    {latestSchedule?.updatedAt && (
      <div className="text-xs text-slate-400">
        Cập nhật:{" "}
        <span className="font-medium text-slate-600">
          {dayjs(latestSchedule.updatedAt).format(
            "DD/MM/YYYY HH:mm"
          )}
        </span>
      </div>
    )}
  </div>

  {/* CONTENT */}

  <div className="erp-dashboard-slider bg-slate-50 p-4 md:p-6">
    <h3 className="mb-3 text-base font-bold text-slate-800">Coi cái này đi</h3>
    <Carousel autoplay autoplaySpeed={4200} effect="fade" pauseOnHover className="erp-dashboard-slider-carousel">
      {dashboardSlides.map((slide) => (
        <div key={slide.src}>
          <div className="erp-dashboard-slide overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <Image
              src={slide.src}
              alt={slide.alt}
              width="100%"
              className="block"
              preview={{ mask: <div className="text-sm font-medium">Xem ảnh lớn</div> }}
            />
            <div className="erp-dashboard-slide-copy">
              <strong>{slide.title}</strong>
              <span>{slide.description}</span>
            </div>
          </div>
        </div>
      ))}
    </Carousel>
  </div>
</Card>

      <Modal
        open={previousScheduleOpen}
        title="Lịch làm việc tuần trước"
        footer={null}
        onCancel={() => setPreviousScheduleOpen(false)}
        width={900}
      >
        {previousSchedule?.imageUrl && (
          <Image
            src={previousSchedule.imageUrl}
            alt="Lịch làm việc tuần trước"
            width="100%"
            preview={{ mask: <div className="text-sm font-medium">Xem lịch lớn</div> }}
          />
        )}
        {previousSchedule?.createdAt && (
          <div className="mt-3 text-right text-xs text-slate-400">
            Cập nhật: {dayjs(previousSchedule.createdAt).format("DD/MM/YYYY HH:mm")}
          </div>
        )}
      </Modal>

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
