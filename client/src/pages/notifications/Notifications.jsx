import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  AppstoreOutlined,
  BellOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloudUploadOutlined,
  CoffeeOutlined,
  CrownOutlined,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  TrophyOutlined,
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
  getWorkSchedules,
  getWorkSchedule,
  deleteWorkSchedule,
  reorderWorkSchedules,
  createDashboardSlide,
  updateWorkSchedule,
} from "../../services/workSchedule.service";
import { useAuth } from "../../store/AuthContext";
import { getRolePermissions, getSystemStatus, setFeatureVisibility, setMaintenanceMode, setRolePermissions } from "../../services/system.service";
import { onSystemNotificationChanged } from "../../services/socket";

const AdminToggle = ({ checked, loading = false, onChange, label }) => (
  <label
    className={`admin-plane-toggle${loading ? " is-loading" : ""}`}
    aria-label={label}
    aria-busy={loading}
  >
    <input
      type="checkbox"
      className="admin-plane-toggle__input"
      checked={Boolean(checked)}
      disabled={loading}
      onChange={(event) => onChange(event.target.checked)}
    />
    <span className="admin-plane-toggle__track" aria-hidden="true">
      <span className="admin-plane-toggle__plane">
        <svg viewBox="0 0 13 13" focusable="false">
          <path d="M1.56 5.417h3.956L4.47.108A.11.11 0 0 1 4.577 0h.785c.09 0 .174.035.23.098l1.544 2.718h1.16a.434.434 0 0 1 0 .867h-.66l.999 1.734h3.296a1.083 1.083 0 0 1 0 2.166H8.635l-1 1.734h.66a.434.434 0 0 1 0 .867h-1.16l-1.543 2.682a.215.215 0 0 1-.23.134h-.785a.11.11 0 0 1-.107-.13l1.046-5.287H1.56l-.669.968a.262.262 0 0 1-.219.116H.107A.107.107 0 0 1 .006 8.523l.575-1.665a1.08 1.08 0 0 0 0-.716L.006 4.48a.108.108 0 0 1 .1-.144h.566c.083 0 .162.037.219.115l.669.965Z" />
        </svg>
      </span>
      <span className="admin-plane-toggle__street-middle" />
      <span className="admin-plane-toggle__cloud" />
      <span className="admin-plane-toggle__cloud admin-plane-toggle__cloud--two" />
    </span>
  </label>
);

const Notifications = () => {
  const { user } = useAuth();
  const [form] = Form.useForm();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingNotification, setEditingNotification] = useState(null);

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [visibilitySavingId, setVisibilitySavingId] = useState(null);

  const [workSchedule, setWorkSchedule] = useState(null);
  const [workSchedules, setWorkSchedules] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleUploading, setScheduleUploading] = useState(false);
  const [scheduleDeleting, setScheduleDeleting] = useState(false);
  const [scheduleReordering, setScheduleReordering] = useState(false);
  const [draggedScheduleIndex, setDraggedScheduleIndex] = useState(null);
  const [dragOverScheduleIndex, setDragOverScheduleIndex] = useState(null);
  const [scheduleDragPreview, setScheduleDragPreview] = useState(null);
  const dragOverScheduleIndexRef = useRef(null);
  const schedulePointerRef = useRef(null);
  const suppressScheduleClickRef = useRef(false);
  const [permissionConfig, setPermissionConfig] = useState(null);
  const [permissionSaving, setPermissionSaving] = useState(null);
  const [expandedPermissionGroup, setExpandedPermissionGroup] = useState("Nhân viên");
  const [maintenanceMode, setMaintenanceModeState] = useState(false);
  const [maintenanceSaving, setMaintenanceSaving] = useState(false);
  const [features, setFeatures] = useState({ cfs: true, caro: true, chess: true });
  const [featureSaving, setFeatureSaving] = useState(null);
  const [notificationScope, setNotificationScope] = useState("priority");
  // =========================
  // LOAD DATA
  // =========================

  const queryClient = useQueryClient();
  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await getNotifications({ includeInactive: true });
      const data = response.data?.data?.notifications ?? response.data?.notifications ?? [];
      return Array.isArray(data) ? data : [];
    },
    placeholderData: (previous) => previous,
  });
  const notifications = notificationsQuery.data || [];
  const isNotificationManager = ["admin", "manager"].includes(user?.role);
  const displayedNotifications = isNotificationManager && notificationScope === "priority"
    ? notifications.filter((item) => ["warning", "error"].includes(item.type))
    : notifications;
  const permissionGroups = (permissionConfig?.permissions || []).reduce((groups, permission) => {
    (groups[permission.group] ||= []).push(permission);
    return groups;
  }, {});
  const loading = notificationsQuery.isFetching;
  const setNotifications = (updater) => queryClient.setQueryData(["notifications"], (current = []) => typeof updater === "function" ? updater(current) : updater);
  const loadNotifications = notificationsQuery.refetch;
  const loadWorkSchedule = useCallback(async () => {
    try {
      setScheduleLoading(true);

      const [scheduleResponse, slidesResponse] = await Promise.all([getWorkSchedule(), getWorkSchedules()]);
      const scheduleData = scheduleResponse?.data?.data ?? scheduleResponse?.data ?? null;
      const slidesData = slidesResponse?.data?.data ?? slidesResponse?.data ?? [];
      setWorkSchedule(scheduleData);
      setWorkSchedules(Array.isArray(slidesData) ? slidesData : []);
    } catch (error) {
      console.error("Load work schedule error:", error);

      message.error(
        error.response?.data?.message || "Không thể tải lịch làm việc",
      );
    } finally {
      setScheduleLoading(false);
    }
  }, []);

  const loadMaintenance = useCallback(async () => {
    if (user?.role !== "admin") return;
    try {
      const [response, permissionsResponse] = await Promise.all([getSystemStatus(), getRolePermissions()]);
      const status = response.data?.data || {};
      setMaintenanceModeState(Boolean(status.maintenanceMode));
      setFeatures((current) => ({ ...current, ...(status.features || {}) }));
      setPermissionConfig(permissionsResponse.data?.data || null);
    } catch {}
  }, [user?.role]);

  useEffect(() => {
    void loadWorkSchedule();
    void loadMaintenance();
  }, [loadNotifications, loadWorkSchedule, loadMaintenance]);
  useEffect(() => onSystemNotificationChanged(loadNotifications), [loadNotifications]);
  const changeMaintenance = async (checked) => { try { setMaintenanceSaving(true); await setMaintenanceMode(checked); setMaintenanceModeState(checked); message.success(checked ? "Đã bật chế độ bảo trì" : "Đã tắt chế độ bảo trì"); } catch (error) { message.error(error.response?.data?.message || "Không thể cập nhật chế độ bảo trì"); } finally { setMaintenanceSaving(false); } };
  const changeFeature = async (feature, enabled) => {
    try {
      setFeatureSaving(feature);
      const response = await setFeatureVisibility(feature, enabled);
      setFeatures((current) => ({ ...current, ...(response.data?.data?.features || { [feature]: enabled }) }));
      message.success(enabled ? "Đã bật hiển thị tính năng" : "Đã tắt hiển thị tính năng");
    } catch (error) {
      message.error(error.response?.data?.message || "Không thể cập nhật tính năng");
    } finally {
      setFeatureSaving(null);
    }
  };

  const changeRolePermission = async (role, permission, enabled) => {
    if (!permissionConfig || permissionSaving) return;
    const next = Object.fromEntries((permissionConfig.roles || []).map(({ key }) => [key, [...(permissionConfig.rolePermissions?.[key] || [])]]));
    next[role] = enabled ? [...new Set([...next[role], permission])] : next[role].filter((item) => item !== permission);
    try {
      setPermissionSaving(`${role}:${permission}`);
      const response = await setRolePermissions(next);
      setPermissionConfig((current) => current ? { ...current, rolePermissions: response.data?.data?.rolePermissions || next } : current);
      message.success("Đã cập nhật phân quyền");
    } catch (error) {
      message.error(error.response?.data?.message || "Không thể cập nhật phân quyền");
    } finally {
      setPermissionSaving(null);
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

  const handleSlideUpload = async ({ file, onSuccess, onError }) => {
    try {
      setScheduleUploading(true);
      const cloudinaryData = await uploadScheduleToCloudinary(file);
      const response = await createDashboardSlide({ imageUrl: cloudinaryData.secure_url, publicId: cloudinaryData.public_id });
      const newSlide = response.data?.data;
      if (!newSlide) throw new Error("Không nhận được ảnh trình chiếu");
      setWorkSchedules((current) => [newSlide, ...current]);
      message.success("Đã thêm ảnh trình chiếu");
      onSuccess?.();
    } catch (error) {
      message.error(error.response?.data?.message || error.message || "Không thể thêm ảnh trình chiếu");
      onError?.(error);
    } finally {
      setScheduleUploading(false);
    }
  };

  const handleScheduleRequest = ({ file, onSuccess, onError }) => {
    if (!workSchedule?.imageUrl) return handleScheduleUpload({ file, onSuccess, onError });
    Modal.confirm({
      title: "Cập nhật lịch làm việc?",
      content: "Lịch cũ vẫn được lưu để có thể xem lại tuần trước.",
      okText: "Cập nhật lịch",
      cancelText: "Hủy",
      onOk: () => handleScheduleUpload({ file, onSuccess, onError }),
    });
  };
  const handleDeleteWorkSchedule = async (scheduleId) => {
    try {
      setScheduleDeleting(true);
      await deleteWorkSchedule(scheduleId);
      if (scheduleId) setWorkSchedules((current) => current.filter((schedule) => schedule._id !== scheduleId));
      else await loadWorkSchedule();
      message.success(scheduleId ? "Đã xóa ảnh trình chiếu" : "Đã xóa lịch làm việc");
    } catch (error) {
      message.error(error.response?.data?.message || "Không thể xóa lịch làm việc");
    } finally {
      setScheduleDeleting(false);
    }
  };

  const handleReorderWorkSchedules = async (fromIndex, toIndex) => {
    if (fromIndex === toIndex || fromIndex === null || toIndex === null) return;
    const reorderedSchedules = [...workSchedules];
    const [movedSchedule] = reorderedSchedules.splice(fromIndex, 1);
    reorderedSchedules.splice(toIndex, 0, movedSchedule);

    try {
      setScheduleReordering(true);
      const response = await reorderWorkSchedules(reorderedSchedules.map((schedule) => schedule._id));
      const updatedSchedules = response.data?.data;
      setWorkSchedules(Array.isArray(updatedSchedules) ? updatedSchedules : reorderedSchedules);
      message.success("Đã thay đổi thứ tự ảnh lịch");
    } catch (error) {
      message.error(error.response?.data?.message || "Không thể đổi vị trí ảnh lịch");
    } finally {
      setScheduleReordering(false);
    }
  };

  const getScheduleDropIndex = (clientX, clientY) => {
    const target = document.elementFromPoint(clientX, clientY)?.closest("[data-schedule-sort-index]");
    const nextIndex = Number(target?.dataset.scheduleSortIndex);
    return Number.isInteger(nextIndex) ? nextIndex : null;
  };

  const startSchedulePointer = (event, schedule, index) => {
    if (scheduleReordering || scheduleDeleting || event.button > 0 || event.target.closest("button")) return;
    schedulePointerRef.current = { index, pointerId: event.pointerId, x: event.clientX, y: event.clientY, image: schedule.imageUrl, dragging: false };
  };
  const moveSchedulePointer = (event) => {
    const pointer = schedulePointerRef.current;
    if (!pointer || pointer.pointerId !== event.pointerId) return;
    const hasMoved = Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) >= 8;
    if (!pointer.dragging && !hasMoved) return;
    if (!pointer.dragging) {
      pointer.dragging = true;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      setDraggedScheduleIndex(pointer.index);
      setDragOverScheduleIndex(pointer.index);
      dragOverScheduleIndexRef.current = pointer.index;
    }
    event.preventDefault();
    setScheduleDragPreview({ image: pointer.image, x: event.clientX, y: event.clientY });
    const nextIndex = getScheduleDropIndex(event.clientX, event.clientY);
    if (nextIndex !== null && nextIndex !== dragOverScheduleIndexRef.current) {
      dragOverScheduleIndexRef.current = nextIndex;
      setDragOverScheduleIndex(nextIndex);
    }
  };
  const endSchedulePointer = (event) => {
    const pointer = schedulePointerRef.current;
    if (!pointer || pointer.pointerId !== event.pointerId) return;
    schedulePointerRef.current = null;
    if (!pointer.dragging) return;
    suppressScheduleClickRef.current = true;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    handleReorderWorkSchedules(pointer.index, dragOverScheduleIndexRef.current);
    setDraggedScheduleIndex(null);
    setDragOverScheduleIndex(null);
    dragOverScheduleIndexRef.current = null;
    setScheduleDragPreview(null);
  };
  const cancelSchedulePointer = () => {
    schedulePointerRef.current = null;
    setDraggedScheduleIndex(null); setDragOverScheduleIndex(null); dragOverScheduleIndexRef.current = null; setScheduleDragPreview(null);
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

  const handleToggleVisibility = async (notification) => {
    const nextIsActive = notification.isActive === false;
    try {
      setVisibilitySavingId(notification._id);
      await updateNotification(notification._id, { isActive: nextIsActive });
      setNotifications((current) => current.map((item) => (
        item._id === notification._id ? { ...item, isActive: nextIsActive } : item
      )));
      message.success(nextIsActive ? "Đã hiện thông báo cho mọi người" : "Đã ẩn thông báo khỏi mọi người");
    } catch (error) {
      message.error(error.response?.data?.message || "Không thể cập nhật hiển thị thông báo");
    } finally {
      setVisibilitySavingId(null);
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
      width: 158,
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

          <Tooltip title={record.isActive === false ? "Hiện lại cho mọi người" : "Ẩn khỏi mọi người"}>
            <Button
              type="text"
              className={record.isActive === false ? "text-emerald-600 hover:text-emerald-500" : "text-slate-500 hover:text-amber-600"}
              icon={record.isActive === false ? <EyeOutlined /> : <EyeInvisibleOutlined />}
              loading={visibilitySavingId === record._id}
              onClick={() => handleToggleVisibility(record)}
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
    <div className="notifications-page space-y-5">
      {/* ================= HEADER ================= */}

      <div className="erp-page-header">
        <div>
          <h1 className="erp-page-title">{user?.role === "admin" ? "Quản trị hệ thống" : "Thông báo"}</h1>
        </div>

        <Space wrap>
          <Button
            icon={<ReloadOutlined />}
            size="large"
            loading={loading}
            onClick={() => {
              void loadNotifications();
              void loadWorkSchedule();
              void loadMaintenance();
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
      {user?.role === "admin" && (
        <Card className="erp-section-card">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-600"><AppstoreOutlined /></div>
            <div>
              <h2 className="m-0 text-base font-semibold text-slate-800">Vận hành & tính năng</h2>
              <p className="mb-0 mt-1 text-sm text-slate-400">Bật hoặc tắt các trang hiển thị cho toàn hệ thống.</p>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-amber-100 bg-amber-50/60 p-4">
            <div><b className="text-slate-800">Chế độ bảo trì</b><p className="m-0 mt-1 text-sm text-slate-500">Đăng xuất người dùng và hiển thị trang bảo trì. Admin vẫn có thể truy cập để tắt.</p></div>
            <AdminToggle
              checked={maintenanceMode}
              loading={maintenanceSaving}
              onChange={changeMaintenance}
              label="Bật hoặc tắt chế độ bảo trì"
            />
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {[
              { key: "cfs", title: "Yakiuo CFS", description: "Hiển thị trang CFS cho người dùng.", icon: <CoffeeOutlined /> },
              { key: "caro", title: "Cờ caro", description: "Hiển thị trang chơi cờ caro.", icon: <TrophyOutlined /> },
              { key: "chess", title: "Cờ vua", description: "Hiển thị trang chơi cờ vua.", icon: <CrownOutlined /> },
            ].map((feature) => (
              <div key={feature.key} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-3"><span className="text-lg text-blue-600">{feature.icon}</span><div><b className="text-sm text-slate-800">{feature.title}</b><p className="m-0 mt-1 text-xs text-slate-400">{feature.description}</p></div></div>
                <AdminToggle
                  checked={features[feature.key]}
                  loading={featureSaving === feature.key}
                  onChange={(checked) => changeFeature(feature.key, checked)}
                  label={`Bật hoặc tắt ${feature.title}`}
                />
              </div>
            ))}
          </div>
        </Card>
      )}
      {/* ================= WORK SCHEDULE ================= */}

      <Card className="erp-section-card overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-xl text-purple-600"><CalendarOutlined /></div>
            <div>
              <h2 className="m-0 text-base font-semibold text-slate-800">Lịch làm việc tuần này</h2>
              <p className="mb-0 mt-1 text-sm text-slate-400">Cập nhật lịch mới, lịch cũ vẫn giữ để Dashboard xem tuần trước.</p>
            </div>
          </div>
          <Upload accept="image/*" showUploadList={false} customRequest={handleScheduleRequest} disabled={scheduleUploading}>
            <Button type="primary" icon={<CloudUploadOutlined />} loading={scheduleUploading}>{workSchedule ? "Cập nhật lịch" : "Thêm lịch"}</Button>
          </Upload>
        </div>
        <div className="p-5">
          {scheduleLoading ? <div className="py-8 text-center text-sm text-slate-400">Đang tải lịch làm việc...</div> : workSchedule?.imageUrl ? (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50"><Image src={workSchedule.imageUrl} alt="Lịch làm việc tuần này" className="block w-full" preview={{ mask: "Xem lịch" }} /></div>
          ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có lịch làm việc" />}
        </div>
      </Card>

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
                  Ảnh trình chiếu Dashboard
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Kéo để sắp xếp ảnh trình chiếu; hai ảnh vệ sinh cố định vẫn được giữ nguyên.
                </p>
              </div>
            </div>

            <Upload
              accept="image/*"
              showUploadList={false}
              multiple
              customRequest={handleSlideUpload}
              disabled={scheduleUploading}
            >
              <Button
                type="primary"
                icon={<CloudUploadOutlined />}
                loading={scheduleUploading}
              >
                Thêm ảnh trình chiếu
              </Button>
            </Upload>
          </div>
        </div>

        <div className="p-5">
          {scheduleLoading ? (
            <div className="flex min-h-[160px] items-center justify-center">
              <div className="text-sm text-slate-400">
                Đang tải ảnh trình chiếu...
              </div>
            </div>
          ) : workSchedules.length ? (
            <div className="schedule-image-manager-grid">
              {workSchedules.map((schedule, index) => (
                <div
                  key={schedule._id}
                  data-schedule-sort-index={index}
                  className={`schedule-image-manager-item${index === draggedScheduleIndex ? " is-dragging" : ""}${draggedScheduleIndex !== null && index !== draggedScheduleIndex ? " is-reordering" : ""}${index === dragOverScheduleIndex && index !== draggedScheduleIndex ? " is-drop-target" : ""}`}
                  onPointerDown={(event) => startSchedulePointer(event, schedule, index)}
                  onPointerMove={moveSchedulePointer}
                  onPointerUp={endSchedulePointer}
                  onPointerCancel={cancelSchedulePointer}
                  onClickCapture={(event) => {
                    if (!suppressScheduleClickRef.current) return;
                    suppressScheduleClickRef.current = false;
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                >
                  <Image
                    src={schedule.imageUrl}
                    alt={`Ảnh lịch ${index + 1}`}
                    className="schedule-image-manager-preview"
                    preview={{ mask: "Xem lịch" }}
                  />
                  <div className="schedule-image-manager-meta">
                    <span>{schedule.updatedAt ? dayjs(schedule.updatedAt).format("DD/MM/YYYY HH:mm") : "—"}</span>
                    <Popconfirm
                      title="Xóa ảnh trình chiếu này?"
                      description="Ảnh sẽ không còn xuất hiện ở Dashboard."
                      okText="Xóa ảnh"
                      cancelText="Hủy"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => handleDeleteWorkSchedule(schedule._id)}
                    >
                      <Button danger type="text" size="small" icon={<DeleteOutlined />} loading={scheduleDeleting} onPointerDown={(event) => event.stopPropagation()}>
                        Xóa
                      </Button>
                    </Popconfirm>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[160px] items-center justify-center">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Chưa có ảnh trình chiếu nào"
              >
                <Upload
                  accept="image/*"
                  showUploadList={false}
                  multiple
                  customRequest={handleSlideUpload}
                  disabled={scheduleUploading}
                >
                  <Button
                    type="primary"
                    icon={<CloudUploadOutlined />}
                    loading={scheduleUploading}
                  >
                    Thêm ảnh trình chiếu
                  </Button>
                </Upload>
              </Empty>
            </div>
          )}
          {scheduleDragPreview && (
            <div className="erp-image-drag-preview" style={{ left: scheduleDragPreview.x, top: scheduleDragPreview.y }} aria-hidden="true">
              <img src={scheduleDragPreview.image} alt="" />
            </div>
          )}
        </div>
      </Card>

      {user?.role === "admin" && permissionConfig && (
        <Card className="erp-section-card overflow-hidden" styles={{ body: { padding: 0 } }}>
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="m-0 text-base font-semibold text-slate-800">Phân quyền hệ thống</h2>
            <p className="mb-0 mt-1 text-sm text-slate-400">Bật hoặc tắt từng quyền theo vai trò. Thay đổi có hiệu lực ngay.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="px-5 py-3 font-semibold">Chức năng</th>{permissionConfig.roles?.map((role) => <th key={role.key} className="px-4 py-3 text-center font-semibold">{role.label}</th>)}</tr>
              </thead>
              <tbody>
                {Object.entries(permissionGroups).map(([group, permissions]) => {
                  const expanded = expandedPermissionGroup === group;
                  return (
                    <Fragment key={group}>
                      <tr className="border-t border-slate-100 bg-stone-50/70">
                        <td colSpan={(permissionConfig.roles?.length || 0) + 1} className="p-0">
                          <button type="button" className="flex w-full items-center justify-between px-5 py-3 text-left" onClick={() => setExpandedPermissionGroup(expanded ? null : group)}>
                            <span className="font-semibold text-slate-700">{group}<span className="ml-2 text-xs font-normal text-slate-400">{permissions.length} quyền</span></span>
                            <span className="text-xs text-amber-700">{expanded ? "Thu gọn" : "Thiết lập"}</span>
                          </button>
                        </td>
                      </tr>
                      {expanded && permissions.map((permission) => (
                        <tr key={permission.key} className="border-t border-slate-100">
                          <td className="px-5 py-2.5 pl-8 text-slate-600">{permission.action}</td>
                          {permissionConfig.roles?.map((role) => (
                            <td key={role.key} className="px-4 py-2.5 text-center">
                              <input aria-label={`${group} ${permission.action} - ${role.label}`} type="checkbox" className="h-4 w-4 cursor-pointer accent-amber-700" checked={permissionConfig.rolePermissions?.[role.key]?.includes(permission.key) || false} disabled={Boolean(permissionSaving)} onChange={(event) => changeRolePermission(role.key, permission.key, event.target.checked)} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-800">
                Danh sách thông báo
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Theo dõi và quản lý các thông báo trong hệ thống.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isNotificationManager && (
                <Select
                  size="small"
                  value={notificationScope}
                  onChange={setNotificationScope}
                  className="min-w-36"
                  options={[
                    { value: "priority", label: "Ưu tiên" },
                    { value: "all", label: "Tất cả" },
                  ]}
                />
              )}
              <Tag className="w-fit rounded-full px-3 py-1">
                {displayedNotifications.length} thông báo
              </Tag>
            </div>
          </div>
        </div>

        <Table
          rowKey="_id"
          loading={loading}
          dataSource={displayedNotifications}
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
                description={notificationScope === "priority" ? "Chưa có thông báo ưu tiên" : "Chưa có thông báo nào"}
              />
            ),
          }}
        />
      </Card>

      {/* ================= MODAL ================= */}

      <Modal
        className="notifications-editor-modal"
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
