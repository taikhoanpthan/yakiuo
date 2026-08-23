import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  message,
} from "antd";

import {
  BellOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  WarningOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";

import {
  getNotifications,
  createNotification,
  updateNotification,
  deleteNotification,
} from "../../services/notificationService";

const Notifications = () => {
  const [form] = Form.useForm();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingNotification, setEditingNotification] = useState(null);

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // =========================
  // LOAD DATA
  // =========================

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);

      const response = await getNotifications();

      const data =
        response.data?.data?.notifications ??
        response.data?.notifications ??
        [];

      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Load notifications error:", error);

      message.error(
        error.response?.data?.message || "Không thể tải danh sách thông báo",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  // =========================
  // STATISTICS
  // =========================

  const statistics = useMemo(() => {
    const total = notifications.length;

    const active = notifications.filter(
      (item) => item.isActive !== false,
    ).length;

    const warning = notifications.filter(
      (item) => item.type === "warning" || item.type === "error",
    ).length;

    const success = notifications.filter(
      (item) => item.type === "success",
    ).length;

    return {
      total,
      active,
      warning,
      success,
    };
  }, [notifications]);

  // =========================
  // CREATE
  // =========================

  const openCreateModal = () => {
    setEditingNotification(null);

    form.resetFields();

    form.setFieldsValue({
      type: "info",
    });

    setModalOpen(true);
  };

  // =========================
  // EDIT
  // =========================

  const openEditModal = (notification) => {
    setEditingNotification(notification);

    form.setFieldsValue({
      title: notification.title || "",
      content: notification.content || "",
      type: notification.type || "info",
    });

    setModalOpen(true);
  };

  // =========================
  // CLOSE MODAL
  // =========================

  const handleCancel = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingNotification(null);
    form.resetFields();
  };

  // =========================
  // SUBMIT
  // =========================

  const handleSubmit = (values) => {
    // Đóng modal ngay
    setModalOpen(false);
    setEditingNotification(null);
    form.resetFields();

    // POST chạy ngay
    createNotification(values)
      .then((response) => {
        const newNotification = response.data?.data?.notification;

        if (newNotification) {
          setNotifications((prev) => [newNotification, ...prev]);
        }

        message.success("Đã tạo thông báo");
      })
      .catch((error) => {
        console.error("Create notification error:", error);

        message.error(
          error.response?.data?.message || "Không thể tạo thông báo",
        );
      });
  };

  // =========================
  // DELETE
  // =========================

  const handleDelete = async (id) => {
    try {
      setDeletingId(id);

      await deleteNotification(id);

      // Cập nhật UI ngay lập tức
      setNotifications((prev) => prev.filter((item) => item._id !== id));

      message.success("Đã xóa thông báo");
    } catch (error) {
      console.error("Delete notification error:", error);

      message.error(error.response?.data?.message || "Không thể xóa thông báo");
    } finally {
      setDeletingId(null);
    }
  };

  // =========================
  // TYPE CONFIG
  // =========================

  const getTypeConfig = (type) => {
    switch (type) {
      case "success":
        return {
          label: "Thành công",
          color: "success",
          icon: <CheckCircleOutlined />,
        };

      case "warning":
        return {
          label: "Cảnh báo",
          color: "warning",
          icon: <WarningOutlined />,
        };

      case "error":
        return {
          label: "Quan trọng",
          color: "error",
          icon: <ExclamationCircleOutlined />,
        };

      default:
        return {
          label: "Thông tin",
          color: "blue",
          icon: <InfoCircleOutlined />,
        };
    }
  };

  // =========================
  // TABLE
  // =========================

  const columns = [
    {
      title: "Thông báo",
      key: "notification",
      width: 300,
      render: (_, record) => {
        const config = getTypeConfig(record.type);

        return (
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  record.type === "success"
                    ? "bg-emerald-50 text-emerald-600"
                    : record.type === "warning"
                      ? "bg-amber-50 text-amber-600"
                      : record.type === "error"
                        ? "bg-red-50 text-red-600"
                        : "bg-blue-50 text-blue-600"
                }`}
              >
                {config.icon}
              </span>

              <Tooltip title={record.title}>
                <div className="min-w-0">
                  <div className="truncate font-semibold text-slate-800">
                    {record.title || "Không có tiêu đề"}
                  </div>

                  <div className="mt-0.5 text-xs text-slate-400">
                    {config.label}
                  </div>
                </div>
              </Tooltip>
            </div>
          </div>
        );
      },
    },

    {
      title: "Nội dung",
      dataIndex: "content",
      key: "content",
      width: 360,
      render: (value) => {
        if (!value) {
          return <span className="text-slate-400">—</span>;
        }

        return (
          <Tooltip title={value}>
            <div className="max-w-[320px] truncate text-sm text-slate-600">
              {value}
            </div>
          </Tooltip>
        );
      },
    },

    {
      title: "Loại",
      dataIndex: "type",
      key: "type",
      width: 140,
      align: "center",
      render: (value) => {
        const config = getTypeConfig(value);

        return (
          <Tag
            color={config.color}
            icon={config.icon}
            className="rounded-full px-3 py-1"
          >
            {config.label}
          </Tag>
        );
      },
    },

    {
      title: "Người tạo",
      key: "createdBy",
      width: 180,
      render: (_, record) => {
        const user = record.createdBy;

        return (
          <div>
            <div className="font-medium text-slate-700">
              {user?.fullName || user?.username || "—"}
            </div>

            {user?.role && (
              <div className="mt-0.5 text-xs text-slate-400">{user.role}</div>
            )}
          </div>
        );
      },
    },

    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 170,
      render: (value) => (
        <div className="text-sm text-slate-500">
          {value ? dayjs(value).format("DD/MM/YYYY HH:mm") : "—"}
        </div>
      ),
    },

    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      width: 140,
      align: "center",
      render: (value) =>
        value !== false ? (
          <Tag color="success" className="rounded-full px-3">
            Đang hiển thị
          </Tag>
        ) : (
          <Tag className="rounded-full px-3">Đã ẩn</Tag>
        ),
    },

    {
      title: "Thao tác",
      key: "actions",
      fixed: "right",
      width: 120,
      align: "center",
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Chỉnh sửa">
            <Button
              type="text"
              className="text-slate-500 hover:text-blue-600"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
            />
          </Tooltip>

          <Popconfirm
            title="Xóa thông báo?"
            description="Thông báo này sẽ bị xóa khỏi hệ thống."
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{
              danger: true,
            }}
            onConfirm={() => handleDelete(record._id)}
          >
            <Tooltip title="Xóa">
              <Button
                danger
                type="text"
                icon={<DeleteOutlined />}
                loading={deletingId === record._id}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // =========================
  // RENDER
  // =========================

  return (
    <div className="space-y-5">
      {/* ================= HEADER ================= */}

      <div className="erp-page-header">
        <div>
          <div className="erp-page-eyebrow">Quản trị hệ thống</div>

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-600">
              <BellOutlined />
            </div>

            <div>
              <h1 className="erp-page-title">Thông báo</h1>

              <p className="erp-page-description">
                Quản lý các thông báo được gửi đến nhân viên trong hệ thống.
              </p>
            </div>
          </div>
        </div>

        <Space wrap>
          <Button
            icon={<ReloadOutlined />}
            size="large"
            loading={loading}
            onClick={loadNotifications}
          >
            Làm mới
          </Button>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={openCreateModal}
          >
            Tạo thông báo
          </Button>
        </Space>
      </div>

      {/* ================= STATS ================= */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="erp-section-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Tổng thông báo</div>

              <div className="mt-1 text-2xl font-bold text-slate-800">
                {statistics.total}
              </div>

              <div className="mt-1 text-xs text-slate-400">
                Tất cả thông báo
              </div>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-600">
              <BellOutlined />
            </div>
          </div>
        </Card>

        <Card className="erp-section-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Đang hiển thị</div>

              <div className="mt-1 text-2xl font-bold text-slate-800">
                {statistics.active}
              </div>

              <div className="mt-1 text-xs text-emerald-500">
                Đang hoạt động
              </div>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-xl text-emerald-600">
              <CheckCircleOutlined />
            </div>
          </div>
        </Card>

        <Card className="erp-section-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Cảnh báo</div>

              <div className="mt-1 text-2xl font-bold text-slate-800">
                {statistics.warning}
              </div>

              <div className="mt-1 text-xs text-amber-500">Cần chú ý</div>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-xl text-amber-600">
              <WarningOutlined />
            </div>
          </div>
        </Card>

        <Card className="erp-section-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Thành công</div>

              <div className="mt-1 text-2xl font-bold text-slate-800">
                {statistics.success}
              </div>

              <div className="mt-1 text-xs text-blue-500">
                Thông báo tích cực
              </div>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-xl text-purple-600">
              <CheckCircleOutlined />
            </div>
          </div>
        </Card>
      </div>

      {/* ================= TABLE ================= */}

      <Card
        className="erp-section-card overflow-hidden"
        styles={{
          body: {
            padding: 0,
          },
        }}
      >
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800">
                Danh sách thông báo
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Theo dõi và quản lý các thông báo trong hệ thống.
              </p>
            </div>

            <Tag className="rounded-full px-3 py-1">
              {notifications.length} thông báo
            </Tag>
          </div>
        </div>

        <Table
          rowKey="_id"
          loading={loading}
          dataSource={notifications}
          columns={columns}
          scroll={{
            x: 1300,
          }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50"],
            showTotal: (total) => `${total} thông báo`,
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Chưa có thông báo nào"
              />
            ),
          }}
        />
      </Card>

      {/* ================= MODAL ================= */}

      <Modal
        open={modalOpen}
        onCancel={handleCancel}
        footer={null}
        destroyOnHidden
        width={620}
        centered
        title={null}
      >
        <div className="pb-2 pt-1">
          {/* Modal header */}

          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-600">
              <BellOutlined />
            </div>

            <div>
              <h2 className="m-0 text-xl font-semibold text-slate-800">
                {editingNotification
                  ? "Chỉnh sửa thông báo"
                  : "Tạo thông báo mới"}
              </h2>

              <p className="m-0 mt-1 text-sm text-slate-400">
                {editingNotification
                  ? "Cập nhật nội dung thông báo."
                  : "Tạo thông báo để gửi đến nhân viên."}
              </p>
            </div>
          </div>

          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            {/* TITLE */}

            <Form.Item
              label={<span className="font-medium">Tiêu đề</span>}
              name="title"
              rules={[
                {
                  required: true,
                  message: "Vui lòng nhập tiêu đề",
                },
                {
                  max: 150,
                  message: "Tiêu đề tối đa 150 ký tự",
                },
              ]}
            >
              <Input
                placeholder="Ví dụ: Thông báo lịch làm việc"
                size="large"
                maxLength={150}
                showCount
              />
            </Form.Item>

            {/* CONTENT */}

            <Form.Item
              label={<span className="font-medium">Nội dung</span>}
              name="content"
              rules={[
                {
                  required: true,
                  message: "Vui lòng nhập nội dung",
                },
                {
                  max: 1000,
                  message: "Nội dung tối đa 1000 ký tự",
                },
              ]}
            >
              <Input.TextArea
                placeholder="Nhập nội dung thông báo..."
                rows={6}
                maxLength={1000}
                showCount
              />
            </Form.Item>

            {/* TYPE */}

            <Form.Item
              label={<span className="font-medium">Loại thông báo</span>}
              name="type"
              rules={[
                {
                  required: true,
                  message: "Vui lòng chọn loại thông báo",
                },
              ]}
            >
              <Select
                size="large"
                options={[
                  {
                    value: "info",
                    label: "🔵  Thông tin",
                  },
                  {
                    value: "success",
                    label: "🟢  Thành công",
                  },
                  {
                    value: "warning",
                    label: "🟠  Cảnh báo",
                  },
                  {
                    value: "error",
                    label: "🔴  Quan trọng",
                  },
                ]}
              />
            </Form.Item>

            {/* FOOTER */}

            <div className="mt-7 flex justify-end gap-2 border-t border-slate-100 pt-5">
              <Button size="large" onClick={handleCancel} disabled={saving}>
                Hủy
              </Button>

              <Button
                type="primary"
                htmlType="submit"
                size="large"
                icon={editingNotification ? <EditOutlined /> : <PlusOutlined />}
                loading={saving}
              >
                {editingNotification ? "Lưu thay đổi" : "Đăng thông báo"}
              </Button>
            </div>
          </Form>
        </div>
      </Modal>
    </div>
  );
};

export default Notifications;
