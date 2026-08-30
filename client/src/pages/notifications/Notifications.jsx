import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  Empty,
  Form,
  Image,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Upload,
  message,
} from "antd";

import {
  BellOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloudUploadOutlined,
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
import {
  getWorkSchedule,
  updateWorkSchedule,
} from "../../services/workSchedule.service";
import { createFeedbackTag, deleteFeedbackTag, getFeedbackTags } from "../../services/feedbackTag.service";
import { useAuth } from "../../store/AuthContext";
const Notifications = () => {
  const { user } = useAuth();
  const [form] = Form.useForm();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingNotification, setEditingNotification] = useState(null);

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [workSchedule, setWorkSchedule] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleUploading, setScheduleUploading] = useState(false);
  const [feedbackTags, setFeedbackTags] = useState([]);
  const [newFeedbackTag, setNewFeedbackTag] = useState("");
  const [tagSaving, setTagSaving] = useState(false);
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
  const loadWorkSchedule = useCallback(async () => {
    try {
      setScheduleLoading(true);

      const response = await getWorkSchedule();

      console.log("WORK SCHEDULE RESPONSE:", response);

      const data = response?.data?.data ?? response?.data ?? null;

      setWorkSchedule(data);
    } catch (error) {
      console.error("Load work schedule error:", error);

      message.error(
        error.response?.data?.message || "Không thể tải lịch làm việc",
      );
    } finally {
      setScheduleLoading(false);
    }
  }, []);

  const loadFeedbackTags = useCallback(async () => {
    if (user?.role !== "admin") return;

    try {
      const response = await getFeedbackTags();
      setFeedbackTags(Array.isArray(response?.data) ? response.data : []);
    } catch {
      setFeedbackTags([]);
    }
  }, [user?.role]);

  useEffect(() => {
    void loadNotifications();
    void loadWorkSchedule();
    void loadFeedbackTags();
  }, [loadNotifications, loadWorkSchedule, loadFeedbackTags]);

  const handleCreateFeedbackTag = async () => {
    const label = newFeedbackTag.trim();
    if (!label) return;

    try {
      setTagSaving(true);
      const response = await createFeedbackTag(label);
      setFeedbackTags((prev) => [...prev, response.data].sort((a, b) => a.label.localeCompare(b.label, "vi")));
      setNewFeedbackTag("");
      message.success("Đã tạo nhãn Feedback");
    } catch (error) {
      message.error(error?.response?.data?.message || "Không thể tạo nhãn Feedback");
    } finally {
      setTagSaving(false);
    }
  };

  const handleDeleteFeedbackTag = async (id) => {
    try {
      await deleteFeedbackTag(id);
      setFeedbackTags((prev) => prev.filter((tag) => tag._id !== id));
      message.success("Đã xóa nhãn Feedback");
    } catch (error) {
      message.error(error?.response?.data?.message || "Không thể xóa nhãn Feedback");
    }
  };

  const uploadScheduleToCloudinary = async (file) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      throw new Error("Thiếu cấu hình Cloudinary");
    }

    const formData = new FormData();

    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error?.message || "Upload Cloudinary thất bại");
    }

    return data;
  };
  const handleScheduleUpload = async ({ file, onSuccess, onError }) => {
    try {
      setScheduleUploading(true);

      // Upload ảnh mới lên Cloudinary
      const cloudinaryData = await uploadScheduleToCloudinary(file);

      // Update record hiện tại
      const response = await updateWorkSchedule({
        imageUrl: cloudinaryData.secure_url,
        publicId: cloudinaryData.public_id,
      });

      const updatedSchedule = response.data?.data ?? null;

      setWorkSchedule(updatedSchedule);

      message.success("Đã cập nhật lịch làm việc");

      onSuccess?.();
    } catch (error) {
      console.error("Upload work schedule error:", error);

      message.error(
        error.response?.data?.message ||
          error.message ||
          "Không thể cập nhật lịch làm việc",
      );

      onError?.(error);
    } finally {
      setScheduleUploading(false);
    }
  };
  const handleScheduleRequest = ({ file, onSuccess, onError }) => {
    if (!workSchedule?.imageUrl) {
      void handleScheduleUpload({
        file,
        onSuccess,
        onError,
      });

      return;
    }

    Modal.confirm({
      title: "Thay thế lịch làm việc?",
      icon: <ExclamationCircleOutlined />,
      content:
        "Lịch làm việc hiện tại sẽ được thay bằng ảnh mới. Bạn có chắc chắn muốn tiếp tục?",
      okText: "Thay thế",
      cancelText: "Hủy",
      okButtonProps: {
        danger: true,
      },
      onOk: () =>
        handleScheduleUpload({
          file,
          onSuccess,
          onError,
        }),
    });
  };

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

  const handleSubmit = async (values) => {
    const notificationId = editingNotification?._id;
    const isEditing = Boolean(notificationId);

    try {
      setSaving(true);

      if (isEditing) {
        await updateNotification(notificationId, values);
      } else {
        await createNotification(values);
      }

      // Tải lại để giữ cả dữ liệu người tạo đã được populate từ server.
      await loadNotifications();

      message.success(isEditing ? "Đã cập nhật thông báo" : "Đã tạo thông báo");
      setModalOpen(false);
      setEditingNotification(null);
      form.resetFields();
    } catch (error) {
      console.error(`${isEditing ? "Update" : "Create"} notification error:`, error);

      message.error(
        error.response?.data?.message ||
          (isEditing ? "Không thể cập nhật thông báo" : "Không thể tạo thông báo"),
      );
    } finally {
      setSaving(false);
    }
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
            <Button
              danger
              type="text"
              icon={<DeleteOutlined />}
              loading={deletingId === record._id}
            />
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
            onClick={() => {
              void loadNotifications();
              void loadWorkSchedule();
            }}
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
      {/* ================= WORK SCHEDULE ================= */}

      <Card
        className="erp-section-card overflow-hidden"
        styles={{
          body: {
            padding: 0,
          },
        }}
      >
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-xl text-purple-600">
                <CalendarOutlined />
              </div>

              <div>
                <h2 className="text-base font-semibold text-slate-800">
                  Lịch làm việc
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Lịch làm việc hiện tại của nhân viên.
                </p>
              </div>
            </div>

            <Upload
              accept="image/*"
              showUploadList={false}
              customRequest={handleScheduleRequest}
              disabled={scheduleUploading}
            >
              <Button
                type="primary"
                icon={<CloudUploadOutlined />}
                loading={scheduleUploading}
              >
                {workSchedule ? "Cập nhật lịch" : "Thêm lịch"}
              </Button>
            </Upload>
          </div>
        </div>

        <div className="p-5">
          {scheduleLoading ? (
            <div className="flex min-h-[250px] items-center justify-center">
              <div className="text-sm text-slate-400">
                Đang tải lịch làm việc...
              </div>
            </div>
          ) : workSchedule?.imageUrl ? (
            <div>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                <Image
                  src={workSchedule.imageUrl}
                  alt="Lịch làm việc"
                  className="block w-full"
                  preview={{
                    mask: "Xem lịch",
                  }}
                />
              </div>

              <div className="mt-4 flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="text-slate-400">
                  Cập nhật lần cuối:
                  <span className="ml-1 font-medium text-slate-600">
                    {workSchedule.updatedAt
                      ? dayjs(workSchedule.updatedAt).format("DD/MM/YYYY HH:mm")
                      : "—"}
                  </span>
                </div>

                <Tag color="success" className="w-fit rounded-full px-3">
                  Lịch hiện tại
                </Tag>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[250px] items-center justify-center">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Chưa có lịch làm việc"
              >
                <Upload
                  accept="image/*"
                  showUploadList={false}
                  customRequest={handleScheduleRequest}
                  disabled={scheduleUploading}
                >
                  <Button
                    type="primary"
                    icon={<CloudUploadOutlined />}
                    loading={scheduleUploading}
                  >
                    Thêm lịch làm việc
                  </Button>
                </Upload>
              </Empty>
            </div>
          )}
        </div>
      </Card>

      {user?.role === "admin" && (
        <Card className="erp-section-card">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="m-0 text-base font-semibold text-slate-800">Nhãn Feedback cho Premium</h2>
              <p className="mb-0 mt-1 text-sm text-slate-400">Premium sẽ nhìn thấy các nhãn này khi thêm feedback.</p>
            </div>
            <div className="flex gap-2 sm:w-[360px]">
              <Input
                value={newFeedbackTag}
                onChange={(event) => setNewFeedbackTag(event.target.value)}
                onPressEnter={handleCreateFeedbackTag}
                placeholder="Ví dụ: Đồ ăn ngon"
                maxLength={60}
              />
              <Button type="primary" icon={<PlusOutlined />} loading={tagSaving} onClick={handleCreateFeedbackTag}>
                Thêm
              </Button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {feedbackTags.length ? feedbackTags.map((tag) => (
              <Tag key={tag._id} closable onClose={(event) => { event.preventDefault(); handleDeleteFeedbackTag(tag._id); }}>
                {tag.label}
              </Tag>
            )) : <span className="text-sm text-slate-400">Chưa có nhãn nào.</span>}
          </div>
        </Card>
      )}
      {/* ================= STATS ================= */}

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
            showSizeChanger: false,
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
