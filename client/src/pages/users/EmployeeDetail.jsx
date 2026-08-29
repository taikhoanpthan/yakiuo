import { useEffect, useMemo, useState } from "react";

import {
  Button,
  Card,
  DatePicker,
  Empty,
  Image,
  Tag,
  message,
} from "antd";

import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  DownloadOutlined,
  FolderOpenOutlined,
  MailOutlined,
  PhoneOutlined,
  ShoppingOutlined,
  UserOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";

import { getUserCommissions } from "../../services/commission.service";

import {
  getUserCommissionGGImages,
  downloadUserCommissionGGImages,
} from "../../services/commissionGG.service";
import { useAuth } from "../../store/AuthContext";
import HamsterLoader from "../../components/common/HamsterLoader";
import { onOnlineUsers } from "../../services/socket";
import { downloadFile, saveImageToPhotos } from "../../utils/downloadImages";

// =====================================================
// EMPLOYEE DETAIL
// =====================================================

const EmployeeDetail = ({ user, onBack }) => {
  const { user: currentUser } = useAuth();
  const canViewPerformance = ["admin", "manager"].includes(currentUser?.role);
  // =====================================================
  // STATE
  // =====================================================

  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(false);

  const [ggImages, setGgImages] = useState([]);
  const [loadingGGImages, setLoadingGGImages] = useState(false);
  const [ggMonth, setGgMonth] = useState(dayjs());
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [downloadingGGImages, setDownloadingGGImages] = useState(false);

  const currentMonth = dayjs();

  // =====================================================
  // LOAD COMMISSION
  // =====================================================

  const fetchCommissions = async () => {
    if (!user?._id || !canViewPerformance) return;

    try {
      setLoading(true);

      const response = await getUserCommissions(
        user._id,
        currentMonth.month() + 1,
        currentMonth.year(),
      );

      setCommissions(
        Array.isArray(response?.data)
          ? response.data
          : [],
      );
    } catch (error) {
      console.error(
        "GET EMPLOYEE COMMISSION ERROR:",
        error,
      );

      message.error(
        error?.response?.data?.message ||
          "Không thể tải commission nhân viên",
      );

      setCommissions([]);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // LOAD COMMISSION GG
  // =====================================================

  const fetchGGImages = async () => {
    if (!user?._id || !canViewPerformance) return;

    try {
      setLoadingGGImages(true);

      const response =
        await getUserCommissionGGImages(
          user._id,
          ggMonth.format("YYYY-MM"),
        );

      setGgImages(
        Array.isArray(response?.data)
          ? response.data
          : [],
      );
    } catch (error) {
      console.error(
        "GET EMPLOYEE COMMISSION GG IMAGES ERROR:",
        error,
      );

      message.error(
        error?.response?.data?.message ||
          "Không thể tải ảnh Commission GG",
      );

      setGgImages([]);
    } finally {
      setLoadingGGImages(false);
    }
  };

  // =====================================================
  // EFFECT
  // =====================================================

  useEffect(() => {
    fetchCommissions();
  }, [user?._id, canViewPerformance]);

  useEffect(() => {
    fetchGGImages();
  }, [user?._id, ggMonth, canViewPerformance]);

  useEffect(() => {
    const unsubscribe = onOnlineUsers((payload) => {
      setOnlineUserIds(Array.isArray(payload?.userIds) ? payload.userIds : []);
    });

    return unsubscribe;
  }, []);

  // =====================================================
  // TOTAL COMMISSION
  // =====================================================

  const totalCommission = useMemo(() => {
    return commissions.reduce(
      (total, item) =>
        total + Number(item.commission || 0),
      0,
    );
  }, [commissions]);

  // =====================================================
  // WINE COMMISSION
  // =====================================================

  const wineCommission = useMemo(() => {
    return commissions
      .filter((item) => item.type === "wine")
      .reduce(
        (total, item) =>
          total + Number(item.commission || 0),
        0,
      );
  }, [commissions]);

  // =====================================================
  // ABALONE COMMISSION
  // =====================================================

  const abaloneCommission = useMemo(() => {
    return commissions
      .filter((item) => item.type === "abalone")
      .reduce(
        (total, item) =>
          total + Number(item.commission || 0),
        0,
      );
  }, [commissions]);

  // =====================================================
  // FORMAT MONEY
  // =====================================================

  const formatMoney = (value) => {
    return `${Number(value || 0).toLocaleString(
      "vi-VN",
    )} đ`;
  };

  // =====================================================
  // ROLE
  // =====================================================

  const roleConfig = {
    admin: {
      color: "red",
      label: "ADMIN",
    },

    manager: {
      color: "gold",
      label: "MANAGER",
    },

    premium: {
      color: "purple",
      label: "PREMIUM",
    },

    employee: {
      color: "blue",
      label: "EMPLOYEE",
    },
  };

  const role = roleConfig[user?.role] || {
    color: "default",
    label:
      user?.role?.toUpperCase() || "--",
  };

  const handleDownloadAllGGImages = async () => {
    try {
      setDownloadingGGImages(true);
      const archive = await downloadUserCommissionGGImages(user._id, ggMonth.format("YYYY-MM"));
      downloadFile(archive, `commission-gg-${ggMonth.format("YYYY-MM")}.zip`);
      message.success(`Đã tải ${ggImages.length} ảnh`);
    } catch (error) {
      message.error(error.message || "Không thể tải tất cả ảnh");
    } finally {
      setDownloadingGGImages(false);
    }
  };

  const handleSaveGGImage = async (url) => {
    try {
      await saveImageToPhotos(url, `commission-gg-${ggMonth.format("YYYY-MM")}.jpg`);
    } catch (error) {
      if (error.name !== "AbortError") message.error(error.message || "Không thể lưu ảnh");
    }
  };

  const isOnline = onlineUserIds.includes(String(user?._id));
  const isAccountLocked = user?.status === "inactive";

  // =====================================================
  // COVER
  // =====================================================

  const coverImage =
    user?.coverImage ||
    user?.coverPhoto ||
    user?.cover ||
    null;

  const coverPosition = {
    x: user?.coverPosition?.x ?? 50,
    y: user?.coverPosition?.y ?? 50,
  };

  const coverZoom =
    Number(user?.coverZoom) || 1;

  // =====================================================
  // AVATAR
  // =====================================================

  const avatarPosition = {
    x: user?.avatarPosition?.x ?? 50,
    y: user?.avatarPosition?.y ?? 50,
  };

  const avatarZoom =
    Number(user?.avatarZoom) || 1;

  // =====================================================
  // SHIFT
  // =====================================================

  const getShiftLabel = (shift) => {
    if (shift === "morning") {
      return "Ca sáng";
    }

    if (shift === "afternoon") {
      return "Ca chiều";
    }

    if (shift === "evening") {
      return "Ca tối";
    }

    return shift || "--";
  };

  // =====================================================
  // TYPE
  // =====================================================

  const getTypeLabel = (item) => {
    if (item.type === "wine") {
      return item.wineLevel === "3m"
        ? "Rượu > 3 triệu"
        : "Rượu > 1 triệu";
    }

    return "Bào ngư";
  };

  // =====================================================
  // USER NOT FOUND
  // =====================================================

  if (!user) {
    return (
      <Card className="erp-section-card">
        <Empty description="Không tìm thấy nhân viên" />

        <div className="mt-4 flex justify-center">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={onBack}
          >
            Quay lại
          </Button>
        </div>
      </Card>
    );
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="mx-auto w-full max-w-6xl pb-28 lg:pb-8">
      {/* =================================================
          BACK
      ================================================= */}

      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={onBack}
        className="mb-3 rounded-xl px-2 font-semibold text-slate-600"
      >
        Quay lại
      </Button>

      {/* =================================================
          PROFILE HEADER
      ================================================= */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* =================================================
            COVER
        ================================================= */}

        <div
          className="
            relative
            h-48
            overflow-hidden
            bg-gradient-to-br
            from-[#1877f2]
            via-[#3b82f6]
            to-[#8b5cf6]
            sm:h-64
            lg:h-72
          "
        >
          {coverImage ? (
            <>
              <img
                src={coverImage}
                alt={`Ảnh bìa ${
                  user?.fullName || ""
                }`}
                className="
                  absolute
                  inset-0
                  h-full
                  w-full
                  object-cover
                  will-change-transform
                "
                style={{
                  objectPosition: `${coverPosition.x}% ${coverPosition.y}%`,
                  transform: `scale(${coverZoom})`,
                  transformOrigin: "center",
                }}
              />

              {/* OVERLAY */}

              <div
                className="
                  pointer-events-none
                  absolute
                  inset-0
                  bg-gradient-to-t
                  from-black/25
                  via-black/5
                  to-transparent
                "
              />
            </>
          ) : (
            <>
              <div
                className="
                  absolute
                  -right-12
                  -top-20
                  h-64
                  w-64
                  rounded-full
                  bg-white/15
                  blur-2xl
                "
              />

              <div
                className="
                  absolute
                  -bottom-24
                  left-1/4
                  h-56
                  w-56
                  rounded-full
                  bg-cyan-300/20
                  blur-2xl
                "
              />
            </>
          )}
        </div>

        {/* =================================================
            PROFILE INFO
        ================================================= */}

        <div className="px-4 pb-4 sm:px-8 sm:pb-6">
          <div
            className="
              flex
              flex-col
              sm:flex-row
              sm:items-end
              sm:gap-5
            "
          >
            {/* =================================================
                AVATAR
            ================================================= */}

            <div className="-mt-14 shrink-0 sm:-mt-20">
              <div
                className="
                  inline-flex
                  rounded-full
                  bg-white
                  p-1
                  shadow-md
                  sm:p-1.5
                "
              >
                <div
                  className="
                    relative
                    h-28
                    w-28
                    overflow-hidden
                    rounded-full
                    bg-slate-200
                    sm:h-36
                    sm:w-36
                  "
                >
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={
                        user?.fullName ||
                        "Avatar"
                      }
                      className="
                        absolute
                        inset-0
                        h-full
                        w-full
                        object-cover
                        will-change-transform
                      "
                      style={{
                        objectPosition: `${avatarPosition.x}% ${avatarPosition.y}%`,
                        transform: `scale(${avatarZoom})`,
                        transformOrigin:
                          "center",
                      }}
                    />
                  ) : (
                    <div
                      className="
                        flex
                        h-full
                        w-full
                        items-center
                        justify-center
                        text-4xl
                        font-bold
                        text-slate-600
                        sm:text-5xl
                      "
                    >
                      {user?.fullName
                        ?.charAt(0)
                        ?.toUpperCase() || "U"}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* =================================================
                NAME
            ================================================= */}

            <div
              className="
                min-w-0
                flex-1
                pt-3
                sm:pb-1
                sm:pt-0
              "
            >
              <div className="flex flex-wrap items-center gap-2">
                <h1
                  className="
                    m-0
                    truncate
                    text-2xl
                    font-extrabold
                    text-slate-900
                    sm:text-3xl
                  "
                >
                  {user.fullName ||
                    "Chưa có tên"}
                </h1>

                {user.status ===
                  "active" && (
                  <CheckCircleOutlined className="text-lg text-[#1877f2]" />
                )}
              </div>

              <div
                className="
                  mt-1
                  flex
                  flex-wrap
                  items-center
                  gap-2
                  text-sm
                  font-medium
                  text-slate-500
                "
              >
                <span>
                  @
                  {user.username ||
                    "username"}
                </span>

                <span>·</span>

                <Tag
                  color={role.color}
                  className="m-0"
                >
                  {role.label}
                </Tag>
              </div>
            </div>

            {/* =================================================
                STATUS
            ================================================= */}

            <div className="mt-4 flex gap-2 sm:mt-0 sm:pb-1">
              <Tag
                color={
                  isAccountLocked ? "error" : isOnline ? "success" : "default"
                }
                className="
                  m-0
                  rounded-full
                  px-3
                  py-1
                  text-sm
                "
              >
                {isAccountLocked
                  ? "Đã khóa"
                  : isOnline
                    ? "Đang hoạt động"
                    : "Ngoại tuyến"}
              </Tag>
            </div>
          </div>

          {/* =================================================
              PROFILE TAB
          ================================================= */}

          <div className="mt-5 border-t border-slate-200 pt-3">
            <div
              className="
                inline-flex
                border-b-2
                border-[#1877f2]
                px-4
                pb-2
                text-sm
                font-bold
                text-[#1877f2]
              "
            >
              Tổng quan
            </div>
          </div>
        </div>
      </div>

      {/* =================================================
          BODY
      ================================================= */}

      <div
        className="
          mt-4
          grid
          grid-cols-1
          items-start
          gap-4
          lg:grid-cols-[360px_minmax(0,1fr)]
        "
      >
        {/* =================================================
            LEFT COLUMN
        ================================================= */}

        <div className="contents">
          {/* =================================================
              INTRO
          ================================================= */}

          <Card
            className="
              erp-section-card
              lg:col-start-1
              !rounded-2xl
              !border-slate-200
              shadow-sm
            "
          >
            <h2 className="mb-4 text-xl font-extrabold text-slate-900">
              Giới thiệu
            </h2>

            <div className="space-y-4 text-sm text-slate-700">
              {/* EMAIL */}

              <div className="flex items-start gap-3">
                <MailOutlined className="mt-1 text-lg text-slate-500" />

                <div className="min-w-0">
                  <div className="text-xs text-slate-400">
                    Email
                  </div>

                  <div className="break-all font-semibold">
                    {user.email ||
                      "Chưa cập nhật"}
                  </div>
                </div>
              </div>

              {/* PHONE */}

              <div className="flex items-start gap-3">
                <PhoneOutlined className="mt-1 text-lg text-slate-500" />

                <div>
                  <div className="text-xs text-slate-400">
                    Số điện thoại
                  </div>

                  <div className="font-semibold">
                    {user.phone ||
                      "Chưa cập nhật"}
                  </div>
                </div>
              </div>

              {/* ROLE */}

              <div className="flex items-start gap-3">
                <UserOutlined className="mt-1 text-lg text-slate-500" />

                <div>
                  <div className="text-xs text-slate-400">
                    Vai trò
                  </div>

                  <div className="font-semibold">
                    {role.label}
                  </div>
                </div>
              </div>

              {/* CREATED AT */}

              <div className="flex items-start gap-3">
                <ClockCircleOutlined className="mt-1 text-lg text-slate-500" />

                <div>
                  <div className="text-xs text-slate-400">
                    Tham gia hệ thống
                  </div>

                  <div className="font-semibold">
                    {user.createdAt
                      ? dayjs(
                          user.createdAt,
                        ).format(
                          "DD/MM/YYYY",
                        )
                      : "--"}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* =================================================
              COMMISSION SUMMARY
          ================================================= */}

          <Card
            className="
              erp-section-card
              lg:col-start-1
              !rounded-2xl
              !border-slate-200
              shadow-sm
            "
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div
                  className="
                    text-xs
                    font-bold
                    uppercase
                    tracking-wider
                    text-slate-400
                  "
                >
                  Commission
                </div>

                <h2 className="m-0 text-lg font-extrabold text-slate-900">
                  Tháng{" "}
                  {currentMonth.format(
                    "MM/YYYY",
                  )}
                </h2>
              </div>

              <div
                className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-full
                  bg-blue-50
                  text-[#1877f2]
                "
              >
                <DollarOutlined className="text-lg" />
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <HamsterLoader size="md" />
              </div>
            ) : (
              <>
                {/* TOTAL */}

                <div
                  className="
                    rounded-2xl
                    bg-gradient-to-br
                    from-[#1877f2]
                    to-[#4895ff]
                    p-4
                    text-white
                    shadow-sm
                  "
                >
                  <div className="text-xs font-semibold text-white/75">
                    Tổng thu nhập
                  </div>

                  <div className="mt-1 text-2xl font-extrabold">
                    {formatMoney(
                      totalCommission,
                    )}
                  </div>

                  <div className="mt-3 text-xs text-white/75">
                    {commissions.length} lượt
                    ghi nhận
                  </div>
                </div>

                {/* WINE / ABALONE */}

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">
                      Rượu
                    </div>

                    <div className="mt-1 font-bold text-slate-800">
                      {formatMoney(
                        wineCommission,
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">
                      Bào ngư
                    </div>

                    <div className="mt-1 font-bold text-slate-800">
                      {formatMoney(
                        abaloneCommission,
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </Card>

          {/* =================================================
              COMMISSION GG
          ================================================= */}

          <Card
            className="
              erp-section-card
              lg:col-start-2
              lg:row-start-1
              lg:row-span-3
              !rounded-2xl
              !border-slate-200
              shadow-sm
            "
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    bg-purple-50
                    text-purple-600
                  "
                >
                  <FolderOpenOutlined className="text-lg" />
                </div>

                <div className="min-w-0">
                  <div
                    className="
                      text-xs
                      font-bold
                      uppercase
                      tracking-wider
                      text-slate-400
                    "
                  >
                    Commission GG
                  </div>

                  <h2 className="m-0 truncate text-lg font-extrabold text-slate-900">
                    Ảnh Google
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="text"
                  size="small"
                  icon={<DownloadOutlined />}
                  disabled={!ggImages.length}
                  loading={downloadingGGImages}
                  onClick={handleDownloadAllGGImages}
                >
                  Tải tất cả
                </Button>

                <DatePicker
                  picker="month"
                  value={ggMonth}
                  onChange={(value) =>
                    setGgMonth(
                      value || dayjs(),
                    )
                  }
                  format="MM/YYYY"
                  allowClear={false}
                  size="small"
                />
              </div>
            </div>

            {loadingGGImages ? (
              <div className="flex justify-center py-8">
                <HamsterLoader size="md" />
              </div>
            ) : ggImages.length ? (
              <Image.PreviewGroup toolbarRender={(node, info) => <>{node}<Button type="primary" size="small" onClick={() => handleSaveGGImage(info.image.url)}>Lưu vào Ảnh</Button></>}>
                <div className="grid grid-cols-2 gap-2 lg:max-h-[480px] lg:overflow-y-auto lg:pr-1 lg:overscroll-contain">
                  {ggImages.map((image) => (
                    <Image
                      key={image._id}
                      src={image.imageUrl}
                      alt={`Commission GG ${ggMonth.format(
                        "MM/YYYY",
                      )}`}
                      className="
                        aspect-square
                        overflow-hidden
                        rounded-xl
                        object-cover
                      "
                    />
                  ))}
                </div>
              </Image.PreviewGroup>
            ) : (
              <Empty
                image={
                  Empty.PRESENTED_IMAGE_SIMPLE
                }
                description="Chưa có ảnh trong tháng này"
              />
            )}
          </Card>
        </div>

        {/* =================================================
            RIGHT COLUMN
        ================================================= */}

        <Card
          className="
            erp-section-card
            lg:col-start-1
            !rounded-2xl
            !border-slate-200
            shadow-sm
          "
        >
          {/* =================================================
              COMMISSION ACTIVITY HEADER
          ================================================= */}

          <div
            className="
              mb-4
              flex
              items-center
              justify-between
              border-b
              border-slate-100
              pb-4
            "
          >
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                  bg-blue-50
                  text-[#1877f2]
                "
              >
                <ShoppingOutlined />
              </div>

              <div className="min-w-0">
                <h2 className="m-0 truncate text-lg font-extrabold text-slate-900">
                  Hoạt động commission
                </h2>

                <p className="m-0 text-xs text-slate-500">
                  Tháng{" "}
                  {currentMonth.format(
                    "MM/YYYY",
                  )}
                </p>
              </div>
            </div>

            <span
              className="
                shrink-0
                rounded-full
                bg-slate-100
                px-3
                py-1
                text-xs
                font-bold
                text-slate-600
              "
            >
              {commissions.length}
            </span>
          </div>

          {/* =================================================
              COMMISSION ACTIVITY CONTENT
          ================================================= */}

          {loading ? (
            <div className="flex justify-center py-16">
              <HamsterLoader size="md" />
            </div>
          ) : commissions.length === 0 ? (
            <Empty
              image={
                Empty.PRESENTED_IMAGE_SIMPLE
              }
              description="Nhân viên chưa có commission trong tháng này"
            />
          ) : (
            <div className="space-y-5">
              {commissions.map((item) => (
                <article
                  key={item._id}
                  className="
                    border-b
                    border-slate-100
                    pb-5
                    last:border-0
                    last:pb-0
                  "
                >
                  <div className="flex items-start gap-3">
                    {/* AVATAR */}

                    <div
                      className="
                        relative
                        h-11
                        w-11
                        shrink-0
                        overflow-hidden
                        rounded-full
                        bg-slate-200
                      "
                    >
                      {user?.avatar ? (
                        <img
                          src={user.avatar}
                          alt={
                            user?.fullName ||
                            "Avatar"
                          }
                          className="
                            absolute
                            inset-0
                            h-full
                            w-full
                            object-cover
                          "
                          style={{
                            objectPosition: `${avatarPosition.x}% ${avatarPosition.y}%`,
                            transform: `scale(${avatarZoom})`,
                            transformOrigin:
                              "center",
                          }}
                        />
                      ) : (
                        <div
                          className="
                            flex
                            h-full
                            w-full
                            items-center
                            justify-center
                            font-bold
                            text-slate-600
                          "
                        >
                          {user.fullName
                            ?.charAt(0)
                            ?.toUpperCase() ||
                            "U"}
                        </div>
                      )}
                    </div>

                    {/* CONTENT */}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-bold text-slate-900">
                            {user.fullName ||
                              "Nhân viên"}
                          </div>

                          <div className="text-xs text-slate-500">
                            {dayjs(
                              item.date,
                            ).format(
                              "DD/MM/YYYY",
                            )}{" "}
                            ·{" "}
                            {getShiftLabel(
                              item.shift,
                            )}
                          </div>
                        </div>

                        <div
                          className="
                            shrink-0
                            text-base
                            font-extrabold
                            text-emerald-600
                          "
                        >
                          +
                          {formatMoney(
                            item.commission,
                          )}
                        </div>
                      </div>

                      {/* DESCRIPTION */}

                      <div className="mt-3 text-[15px] leading-6 text-slate-800">
                        Đã ghi nhận commission
                        từ{" "}
                        <strong>
                          {getTypeLabel(
                            item,
                          )}
                        </strong>{" "}
                        tại bàn{" "}
                        <strong>
                          {item.tableNumber ||
                            "--"}
                        </strong>
                        .
                      </div>

                      {/* TAGS */}

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span
                          className={`
                            rounded-full
                            px-3
                            py-1
                            text-xs
                            font-bold
                            ${
                              item.type ===
                              "wine"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-purple-50 text-purple-700"
                            }
                          `}
                        >
                          {item.type ===
                          "wine"
                            ? "Rượu"
                            : "Bào ngư"}
                        </span>

                        <span
                          className="
                            rounded-full
                            bg-slate-100
                            px-3
                            py-1
                            text-xs
                            font-semibold
                            text-slate-600
                          "
                        >
                          Số lượng:{" "}
                          {item.type ===
                          "wine"
                            ? `${
                                item.wineQty ||
                                0
                              } chai`
                            : `${
                                item.abaloneQty ||
                                0
                              } con`}
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default EmployeeDetail;
