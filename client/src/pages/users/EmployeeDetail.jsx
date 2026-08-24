import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Button,
  Card,
  Col,
  Empty,
  Row,
  Spin,
  Statistic,
  Tag,
  message,
} from "antd";

import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  MailOutlined,
  PhoneOutlined,
  ShoppingOutlined,
  UserOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";

import { getUserCommissions } from "../../services/commission.service";

const EmployeeDetail = ({ user, onBack }) => {
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(false);

  const currentMonth = dayjs();

  // =====================================================
  // LOAD COMMISSION
  // =====================================================

  const fetchCommissions = async () => {
    try {
      setLoading(true);

      const response = await getUserCommissions(
        user._id,
        dayjs().month() + 1,
        dayjs().year(),
      );

      setCommissions(response?.data || []);
    } catch (error) {
      console.error("GET EMPLOYEE COMMISSION ERROR:", error);

      message.error(
        error?.response?.data?.message || "Không thể tải commission nhân viên",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommissions();
  }, [user?._id]);

  // =====================================================
  // TOTAL
  // =====================================================

  const totalCommission = useMemo(() => {
    return commissions.reduce(
      (total, item) => total + Number(item.commission || 0),
      0,
    );
  }, [commissions]);

  // =====================================================
  // WINE
  // =====================================================

  const wineCommission = useMemo(() => {
    return commissions
      .filter((item) => item.type === "wine")
      .reduce((total, item) => total + Number(item.commission || 0), 0);
  }, [commissions]);

  // =====================================================
  // ABALONE
  // =====================================================

  const abaloneCommission = useMemo(() => {
    return commissions
      .filter((item) => item.type === "abalone")
      .reduce((total, item) => total + Number(item.commission || 0), 0);
  }, [commissions]);

  // =====================================================
  // FORMAT MONEY
  // =====================================================

  const formatMoney = (value) => {
    return `${Number(value || 0).toLocaleString("vi-VN")} đ`;
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

    employee: {
      color: "blue",
      label: "EMPLOYEE",
    },
  };

  const role = roleConfig[user?.role] || {
    color: "default",
    label: user?.role?.toUpperCase() || "--",
  };

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
      return item.wineLevel === "3m" ? "Rượu > 3 triệu" : "Rượu > 1 triệu";
    }

    return "Bào ngư";
  };

  // =====================================================
  // RENDER
  // =====================================================

  if (!user) {
    return (
      <Card className="erp-section-card">
        <Empty description="Không tìm thấy nhân viên" />

        <div className="mt-4 flex justify-center">
          <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
            Quay lại
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="erp-page-header">
        <div>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={onBack}
            className="mb-2 px-0"
          >
            Quay lại danh sách nhân viên
          </Button>

          <div className="erp-page-eyebrow">Quản trị nhân sự</div>

          <h1 className="erp-page-title">Chi tiết nhân viên</h1>

          <p className="erp-page-description">
            Thông tin cá nhân và commission tháng này.
          </p>
        </div>
      </div>

      {/* =================================================
          PERSONAL INFORMATION
      ================================================= */}

      <Card className="erp-section-card">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          {/* AVATAR */}

          <Avatar
            size={96}
            src={user.avatar || undefined}
            className="shrink-0 bg-slate-200 text-3xl text-slate-600"
          >
            {user.fullName?.charAt(0)?.toUpperCase() || "U"}
          </Avatar>

          {/* BASIC INFO */}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="m-0 text-2xl font-bold text-slate-800">
                {user.fullName || "Chưa có tên"}
              </h2>

              <Tag color={role.color}>{role.label}</Tag>

              {user.status === "active" ? (
                <Tag color="success" icon={<CheckCircleOutlined />}>
                  Hoạt động
                </Tag>
              ) : (
                <Tag color="error">Đã khóa</Tag>
              )}
            </div>

            <div className="mt-1 text-sm text-slate-500">@{user.username}</div>

            {/* INFO */}

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <MailOutlined />
                <span>{user.email || "Chưa có email"}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-600">
                <PhoneOutlined />
                <span>{user.phone || "Chưa có số điện thoại"}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-600">
                <ClockCircleOutlined />

                <span>
                  Tạo ngày{" "}
                  {user.createdAt
                    ? dayjs(user.createdAt).format("DD/MM/YYYY")
                    : "--"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* =================================================
          MONTH COMMISSION
      ================================================= */}

      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="erp-page-eyebrow">Commission</div>

            <h2 className="m-0 text-xl font-bold text-slate-800">
              Tháng {currentMonth.format("MM/YYYY")}
            </h2>
          </div>
        </div>

        {loading ? (
          <Card className="erp-section-card">
            <div className="flex justify-center py-10">
              <Spin />
            </div>
          </Card>
        ) : (
          <Row gutter={[16, 16]}>
            {/* TOTAL */}

            <Col xs={24} md={8}>
              <Card className="erp-section-card h-full">
                <Statistic
                  title="Tổng commission"
                  value={totalCommission}
                  precision={0}
                  prefix={<DollarOutlined />}
                  suffix="đ"
                  formatter={(value) =>
                    Number(value || 0).toLocaleString("vi-VN")
                  }
                />
              </Card>
            </Col>

            {/* WINE */}

            <Col xs={24} md={8}>
              <Card className="erp-section-card h-full">
                <Statistic
                  title="Commission rượu"
                  value={wineCommission}
                  precision={0}
                  prefix="🍷"
                  suffix="đ"
                  formatter={(value) =>
                    Number(value || 0).toLocaleString("vi-VN")
                  }
                />
              </Card>
            </Col>

            {/* ABALONE */}

            <Col xs={24} md={8}>
              <Card className="erp-section-card h-full">
                <Statistic
                  title="Commission bào ngư"
                  value={abaloneCommission}
                  precision={0}
                  prefix="🦪"
                  suffix="đ"
                  formatter={(value) =>
                    Number(value || 0).toLocaleString("vi-VN")
                  }
                />
              </Card>
            </Col>
          </Row>
        )}
      </div>

      {/* =================================================
          COMMISSION HISTORY
      ================================================= */}

      <Card
        title={
          <div className="flex items-center gap-2">
            <ShoppingOutlined />

            <span>Commission tháng {currentMonth.format("MM/YYYY")}</span>

            <Tag>{commissions.length}</Tag>
          </div>
        }
        className="erp-section-card"
      >
        {loading ? (
          <div className="flex justify-center py-8">
            <Spin />
          </div>
        ) : commissions.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Nhân viên chưa có commission trong tháng này"
          />
        ) : (
          <div className="space-y-3">
            {commissions.map((item) => (
              <div
                key={item._id}
                className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {/* LEFT */}

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Tag color={item.type === "wine" ? "blue" : "purple"}>
                        {item.type === "wine" ? "🍷 Rượu" : "🦪 Bào ngư"}
                      </Tag>

                      <span className="font-semibold text-slate-800">
                        {getTypeLabel(item)}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>📅 {dayjs(item.date).format("DD/MM/YYYY")}</span>

                      <span>🪑 Bàn {item.tableNumber}</span>

                      <span>🕐 {getShiftLabel(item.shift)}</span>

                      <span>
                        {item.type === "wine"
                          ? `${item.wineQty} chai`
                          : `${item.abaloneQty} con`}
                      </span>
                    </div>
                  </div>

                  {/* RIGHT */}

                  <div className="text-lg font-bold text-emerald-600">
                    +{formatMoney(item.commission)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default EmployeeDetail;
