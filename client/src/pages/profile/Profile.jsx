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
} from "@ant-design/icons";

import api from "../../services/api";
import { getMe, updateUser } from "../../services/user.service";

const Profile = () => {
  const [form] = Form.useForm();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

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
    <div className="space-y-6">
      {/* =========================
          PAGE HEADER
      ========================= */}

      <div className="erp-page-header">
        <div>
          <div className="erp-page-eyebrow">
            Tài khoản
          </div>

          <h1 className="erp-page-title">
            Hồ sơ cá nhân
          </h1>

          <p className="erp-page-description">
            Quản lý thông tin cá nhân và ảnh đại diện của bạn.
          </p>
        </div>
      </div>

      {/* =========================
          PROFILE OVERVIEW
      ========================= */}

      <Card className="erp-section-card">
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* AVATAR */}

          <div className="flex flex-col items-center lg:w-56 lg:border-r lg:border-slate-100 lg:pr-8">
            <Avatar
              size={128}
              src={user?.avatar || undefined}
              icon={!user?.avatar && <UserOutlined />}
              className="border-4 border-slate-100 shadow-sm"
            >
              {!user?.avatar &&
                user?.fullName
                  ?.charAt(0)
                  ?.toUpperCase()}
            </Avatar>

            <Upload
              showUploadList={false}
              accept="image/png,image/jpeg,image/webp"
              customRequest={handleUploadAvatar}
            >
              <Button
                className="mt-4"
                icon={<CameraOutlined />}
                loading={uploading}
              >
                {uploading
                  ? "Đang tải..."
                  : "Đổi ảnh đại diện"}
              </Button>
            </Upload>

            <div className="mt-3 text-center text-xs leading-5 text-slate-400">
              JPG, PNG hoặc WEBP
              <br />
              Tối đa 5MB
            </div>
          </div>

          {/* USER INFO */}

          <div className="flex-1">
            <div className="flex flex-col gap-2">
              <h2 className="m-0 text-2xl font-semibold text-slate-800">
                {user?.fullName}
              </h2>

              <div className="text-sm text-slate-500">
                @{user?.username}
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <Tag color={role.color}>
                  {role.label}
                </Tag>

                <Tag
                  color={
                    user?.status === "active"
                      ? "success"
                      : "error"
                  }
                >
                  {user?.status === "active"
                    ? "Đang hoạt động"
                    : "Đã khóa"}
                </Tag>
              </div>
            </div>

            <Divider />

            {/* SUMMARY */}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="mb-1 text-xs text-slate-400">
                  Username
                </div>

                <div className="font-medium text-slate-700">
                  @{user?.username}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="mb-1 text-xs text-slate-400">
                  Email
                </div>

                <div className="break-all font-medium text-slate-700">
                  {user?.email || "Chưa có"}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="mb-1 text-xs text-slate-400">
                  Vai trò
                </div>

                <div className="font-medium text-slate-700">
                  {role.label}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* =========================
          PERSONAL INFORMATION
      ========================= */}

      <Card
        className="erp-section-card"
        title={
          <div className="flex items-center gap-2">
            <UserOutlined />

            <span>Thông tin cá nhân</span>
          </div>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          requiredMark={false}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* FULL NAME */}

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

            {/* EMAIL */}

            <Form.Item
              label="Email"
              name="email"
            >
              <Input
                size="large"
                prefix={<MailOutlined />}
                disabled
              />
            </Form.Item>

            {/* PHONE */}

            <Form.Item
              label="Số điện thoại"
              name="phone"
            >
              <Input
                size="large"
                prefix={<PhoneOutlined />}
                placeholder="Nhập số điện thoại"
              />
            </Form.Item>

            {/* ROLE */}

            <Form.Item label="Quyền tài khoản">
              <Input
                size="large"
                prefix={<SafetyOutlined />}
                value={role.label}
                disabled
              />
            </Form.Item>
          </div>

          {/* SAVE */}

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
      </Card>
    </div>
  );
};

export default Profile;