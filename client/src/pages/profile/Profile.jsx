import { useEffect, useState } from "react";
import {
  Avatar,
  Button,
  Card,
  Divider,
  Form,
  Input,
  message,
  Upload,
  Tag,
} from "antd";

import {
  CameraOutlined,
  SaveOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  SafetyOutlined,
  EditOutlined,
  CloseOutlined,
  DollarOutlined,
  GoogleOutlined,
} from "@ant-design/icons";

import api from "../../services/api";
import { getMe, updateUser } from "../../services/user.service";
import Commission from "../commission/Commission";

const Profile = () => {
  const [form] = Form.useForm();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);

  // =========================
  // GET CURRENT USER
  // =========================

  const fetchProfile = async () => {
    try {
      setLoading(true);

      const response = await getMe();

      const currentUser = response?.data?.user;

      if (!currentUser) {
        throw new Error("Không tìm thấy thông tin người dùng");
      }

      setUser(currentUser);

      form.setFieldsValue({
        fullName: currentUser.fullName || "",
        email: currentUser.email || "",
        phone: currentUser.phone || "",
      });
    } catch (error) {
      console.error("Get profile failed:", error);

      message.error(
        error.response?.data?.message ||
          error.message ||
          "Không thể tải thông tin cá nhân",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // =========================
  // UPLOAD AVATAR
  // =========================

  const handleUploadAvatar = async ({
    file,
    onSuccess,
    onError,
  }) => {
    try {
      // Kiểm tra loại file
      if (!file.type?.startsWith("image/")) {
        throw new Error("Chỉ được upload file hình ảnh");
      }

      // Kiểm tra dung lượng
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Ảnh không được vượt quá 5MB");
      }

      setUploading(true);

      const formData = new FormData();

      formData.append("image", file);

      const response = await api.post(
        "/upload/image",
        formData,
      );

      const avatar = response?.data?.data?.avatar;

      if (!avatar) {
        throw new Error("Không nhận được URL avatar");
      }

      // Update UI ngay lập tức
      setUser((prev) => ({
        ...prev,
        avatar,
      }));

      message.success("Đã cập nhật ảnh đại diện");

      onSuccess?.(response.data);
    } catch (error) {
      console.error("Upload avatar failed:", error);

      message.error(
        error.response?.data?.message ||
          error.message ||
          "Không thể cập nhật ảnh đại diện",
      );

      onError?.(error);
    } finally {
      setUploading(false);
    }
  };

  // =========================
  // UPDATE PROFILE
  // =========================

  const handleSave = async (values) => {
    if (!user?._id) {
      message.error("Không tìm thấy người dùng");
      return;
    }

    try {
      setSaving(true);

      const response = await updateUser(user._id, {
        fullName: values.fullName.trim(),
        phone: values.phone?.trim() || "",
      });

      const updatedUser = response?.data?.user;

      if (!updatedUser) {
        throw new Error("Không nhận được dữ liệu người dùng");
      }

      setUser(updatedUser);

      form.setFieldsValue({
        fullName: updatedUser.fullName || "",
        email: updatedUser.email || "",
        phone: updatedUser.phone || "",
      });

      message.success("Đã cập nhật thông tin cá nhân");
    } catch (error) {
      console.error("Update profile failed:", error);

      message.error(
        error.response?.data?.message ||
          error.message ||
          "Không thể cập nhật thông tin",
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // ROLE
  // =========================

  const roleConfig = {
    admin: {
      label: "ADMIN",
      color: "red",
    },

    manager: {
      label: "MANAGER",
      color: "gold",
    },

    employee: {
      label: "EMPLOYEE",
      color: "blue",
    },
  };

  const role = roleConfig[user?.role] || {
    label: user?.role?.toUpperCase() || "USER",
    color: "default",
  };

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-slate-500">
          Đang tải thông tin cá nhân...
        </div>
      </div>
    );
  }

  // =========================
  // RENDER
  // =========================

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-6">
      {/* PAGE HEADER */}
      <div className="erp-page-header">
        <div>
          <div className="erp-page-eyebrow">Tài khoản</div>
          <h1 className="erp-page-title">Hồ sơ cá nhân</h1>
          <p className="erp-page-description">
            Quản lý thông tin tài khoản, ảnh đại diện và hoa hồng.
          </p>
        </div>
      </div>

      {/* PROFILE CARD */}
      <Card className="erp-section-card overflow-hidden !p-0">
        <div className="bg-gradient-to-r from-slate-100 via-white to-slate-50 px-5 pb-5 pt-7 sm:px-8">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end">
            <div className="relative shrink-0">
              <Avatar
                size={112}
                src={user?.avatar || undefined}
                icon={!user?.avatar && <UserOutlined />}
                className="border-4 border-white shadow-md"
              >
                {!user?.avatar && user?.fullName?.charAt(0)?.toUpperCase()}
              </Avatar>

              <Upload
                showUploadList={false}
                accept="image/png,image/jpeg,image/webp"
                customRequest={handleUploadAvatar}
              >
                <Button
                  type="primary"
                  shape="circle"
                  size="small"
                  icon={<CameraOutlined />}
                  loading={uploading}
                  className="absolute bottom-1 right-1"
                  title="Đổi ảnh đại diện"
                />
              </Upload>
            </div>

            <div className="min-w-0 flex-1 text-center sm:text-left">
              <h2 className="mb-1 truncate text-2xl font-bold text-slate-800">
                {user?.fullName || "Chưa cập nhật"}
              </h2>

              <div className="mb-3 text-sm text-slate-500">
                @{user?.username}
              </div>

              <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                <Tag color={role.color}>{role.label}</Tag>
                <Tag color={user?.status === "active" ? "success" : "error"}>
                  {user?.status === "active" ? "Đang hoạt động" : "Đã khóa"}
                </Tag>
              </div>
            </div>

            <Upload
              showUploadList={false}
              accept="image/png,image/jpeg,image/webp"
              customRequest={handleUploadAvatar}
            >
              <Button
                icon={<CameraOutlined />}
                loading={uploading}
                className="shrink-0"
              >
                Đổi ảnh
              </Button>
            </Upload>
          </div>
        </div>

        <div className="grid grid-cols-1 divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="px-5 py-4">
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
              Username
            </div>
            <div className="truncate font-medium text-slate-700">
              @{user?.username || "—"}
            </div>
          </div>

          <div className="px-5 py-4">
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
              Email
            </div>
            <div className="truncate font-medium text-slate-700">
              {user?.email || "Chưa có"}
            </div>
          </div>

          <div className="px-5 py-4">
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
              Số điện thoại
            </div>
            <div className="font-medium text-slate-700">
              {user?.phone || "Chưa cập nhật"}
            </div>
          </div>
        </div>
      </Card>

      {/* ACCOUNT INFORMATION */}
      <Card className="erp-section-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="m-0 text-base font-semibold text-slate-800">
              Thông tin tài khoản
            </h3>
            <p className="mt-1 mb-0 text-sm text-slate-500">
              Chỉnh sửa họ tên và số điện thoại khi cần.
            </p>
          </div>

          <Button
            type={showEditForm ? "default" : "primary"}
            icon={showEditForm ? <CloseOutlined /> : <EditOutlined />}
            onClick={() => setShowEditForm((prev) => !prev)}
          >
            {showEditForm ? "Đóng" : "Cập nhật thông tin"}
          </Button>
        </div>

        {showEditForm && (
          <>
            <Divider className="my-5" />

            <Form
              form={form}
              layout="vertical"
              onFinish={handleSave}
              requiredMark={false}
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Form.Item
                  label="Họ và tên"
                  name="fullName"
                  rules={[
                    {
                      required: true,
                      message: "Vui lòng nhập họ và tên",
                    },
                    {
                      min: 2,
                      message: "Họ và tên phải có ít nhất 2 ký tự",
                    },
                  ]}
                >
                  <Input
                    size="large"
                    prefix={<UserOutlined />}
                    placeholder="Nhập họ và tên"
                  />
                </Form.Item>

                <Form.Item label="Email" name="email">
                  <Input
                    size="large"
                    prefix={<MailOutlined />}
                    disabled
                  />
                </Form.Item>

                <Form.Item label="Số điện thoại" name="phone">
                  <Input
                    size="large"
                    prefix={<PhoneOutlined />}
                    placeholder="Nhập số điện thoại"
                  />
                </Form.Item>

                <Form.Item label="Quyền tài khoản">
                  <Input
                    size="large"
                    prefix={<SafetyOutlined />}
                    value={role.label}
                    disabled
                  />
                </Form.Item>
              </div>

              <div className="flex justify-end">
                <Button
                  type="primary"
                  size="large"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={saving}
                >
                  Lưu thay đổi
                </Button>
              </div>
            </Form>
          </>
        )}
      </Card>

      {/* COMMISSION - READY FOR BACKEND */}
      <div>
        <div className="mb-3">
          <h3 className="m-0 text-base font-semibold text-slate-800">
            Hoa hồng
          </h3>
          <p className="mt-1 mb-0 text-sm text-slate-500">
            Khu vực đã chuẩn bị sẵn để kết nối dữ liệu backend sau này.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* COMMISSION GG */}
         <Commission />

          {/* NORMAL COMMISSION */}
          <Card className="erp-section-card">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                  <DollarOutlined className="text-xl text-slate-600" />
                </div>

                <div>
                  <h4 className="m-0 text-base font-semibold text-slate-800">
                    Commission
                  </h4>
                  <p className="mt-1 mb-0 text-xs text-slate-400">
                    Hoa hồng thông thường
                  </p>
                </div>
              </div>

              <Tag color="default">Chờ backend</Tag>
            </div>

            <Divider className="my-4" />

            <div className="flex items-end justify-between">
              <div>
                <div className="text-xs text-slate-400">Tổng hoa hồng</div>
                <div className="mt-1 text-2xl font-bold text-slate-300">—</div>
              </div>

              <div className="text-right">
                <div className="text-xs text-slate-400">Trạng thái</div>
                <div className="mt-1 text-sm font-medium text-slate-500">
                  Chưa có dữ liệu
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );

};

export default Profile;