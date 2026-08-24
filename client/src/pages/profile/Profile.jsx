import { useEffect, useState } from "react";

import {
  Avatar,
  Button,
  Card,
  Divider,
  Form,
  Input,
  message,
  Tag,
  Upload,
} from "antd";

import {
  CameraOutlined,
  CheckCircleFilled,
  CloseOutlined,
  DollarOutlined,
  EditOutlined,
  MailOutlined,
  PhoneOutlined,
  SaveOutlined,
  SafetyOutlined,
  UserOutlined,
} from "@ant-design/icons";

import api from "../../services/api";
import {
  getMe,
  updateUser,
} from "../../services/user.service";

import Commission from "../commission/Commission";

const Profile = () => {
  const [form] = Form.useForm();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showEditForm, setShowEditForm] =
    useState(false);

  // =====================================================
  // GET CURRENT USER
  // =====================================================

  const fetchProfile = async () => {
    try {
      setLoading(true);

      const response = await getMe();

      const currentUser =
        response?.data?.user;

      if (!currentUser) {
        throw new Error(
          "Không tìm thấy thông tin người dùng",
        );
      }

      setUser(currentUser);

      form.setFieldsValue({
        fullName:
          currentUser.fullName || "",
        email:
          currentUser.email || "",
        phone:
          currentUser.phone || "",
      });
    } catch (error) {
      console.error(
        "Get profile failed:",
        error,
      );

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

  // =====================================================
  // UPLOAD AVATAR
  // =====================================================

  const handleUploadAvatar = async ({
    file,
    onSuccess,
    onError,
  }) => {
    try {
      if (
        !file.type?.startsWith("image/")
      ) {
        throw new Error(
          "Chỉ được upload file hình ảnh",
        );
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error(
          "Ảnh không được vượt quá 5MB",
        );
      }

      setUploading(true);

      const formData = new FormData();

      formData.append("image", file);

      const response = await api.post(
        "/upload/image",
        formData,
      );

      const avatar =
        response?.data?.data?.avatar;

      if (!avatar) {
        throw new Error(
          "Không nhận được URL avatar",
        );
      }

      setUser((prev) => ({
        ...prev,
        avatar,
      }));

      message.success(
        "Đã cập nhật ảnh đại diện",
      );

      onSuccess?.(response.data);
    } catch (error) {
      console.error(
        "Upload avatar failed:",
        error,
      );

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

  // =====================================================
  // UPDATE PROFILE
  // =====================================================

  const handleSave = async (values) => {
    if (!user?._id) {
      message.error(
        "Không tìm thấy người dùng",
      );
      return;
    }

    try {
      setSaving(true);

      const response =
        await updateUser(user._id, {
          fullName:
            values.fullName.trim(),
          phone:
            values.phone?.trim() || "",
        });

      const updatedUser =
        response?.data?.user;

      if (!updatedUser) {
        throw new Error(
          "Không nhận được dữ liệu người dùng",
        );
      }

      setUser(updatedUser);

      form.setFieldsValue({
        fullName:
          updatedUser.fullName || "",
        email:
          updatedUser.email || "",
        phone:
          updatedUser.phone || "",
      });

      message.success(
        "Đã cập nhật thông tin cá nhân",
      );

      setShowEditForm(false);
    } catch (error) {
      console.error(
        "Update profile failed:",
        error,
      );

      message.error(
        error.response?.data?.message ||
          error.message ||
          "Không thể cập nhật thông tin",
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // ROLE
  // =====================================================

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

  const role =
    roleConfig[user?.role] || {
      label:
        user?.role?.toUpperCase() ||
        "USER",
      color: "default",
    };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="text-sm text-slate-500">
          Đang tải thông tin cá nhân...
        </div>
      </div>
    );
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="yakiuo-profile">
      {/* =================================================
          PROFILE HEADER
      ================================================= */}

      <section className="yakiuo-profile-header">
        {/* COVER */}

        <div className="yakiuo-cover">
          <div className="yakiuo-cover-overlay" />

          <div className="yakiuo-cover-brand">
            <span className="yakiuo-cover-logo">
              Y
            </span>

            <span>
              YAKIUO ISHIKAWA
            </span>
          </div>

          <Upload
            showUploadList={false}
            accept="image/png,image/jpeg,image/webp"
            customRequest={
              handleUploadAvatar
            }
          >
            <Button
              className="yakiuo-cover-camera"
              icon={<CameraOutlined />}
            >
              <span className="hidden sm:inline">
                Chỉnh sửa ảnh bìa
              </span>
              <span className="sm:hidden">
                Chỉnh sửa
              </span>
            </Button>
          </Upload>
        </div>

        {/* PROFILE INFO */}

        <div className="yakiuo-profile-info">
          <div className="yakiuo-profile-main">
            {/* AVATAR */}

            <div className="yakiuo-avatar-wrapper">
              <Avatar
                className="yakiuo-profile-avatar"
                src={
                  user?.avatar ||
                  undefined
                }
                icon={
                  !user?.avatar && (
                    <UserOutlined />
                  )
                }
              >
                {!user?.avatar &&
                  user?.fullName
                    ?.charAt(0)
                    ?.toUpperCase()}
              </Avatar>

              <Upload
                showUploadList={false}
                accept="image/png,image/jpeg,image/webp"
                customRequest={
                  handleUploadAvatar
                }
              >
                <button
                  type="button"
                  className="yakiuo-avatar-camera"
                  disabled={uploading}
                >
                  <CameraOutlined />
                </button>
              </Upload>
            </div>

            {/* NAME */}

            <div className="yakiuo-profile-identity">
              <div className="yakiuo-profile-name-row">
                <h1>
                  {user?.fullName ||
                    "Chưa cập nhật"}
                </h1>

                {user?.status ===
                  "active" && (
                  <CheckCircleFilled className="yakiuo-verified" />
                )}
              </div>

              <div className="yakiuo-profile-username">
                @{user?.username ||
                  "username"}
              </div>

              <div className="yakiuo-profile-meta">
                <Tag color={role.color}>
                  {role.label}
                </Tag>

                <span>
                  <span className="yakiuo-online-dot" />
                  Đang hoạt động
                </span>
              </div>
            </div>

            {/* ACTIONS */}

            <div className="yakiuo-profile-actions">
              <Button
                type={
                  showEditForm
                    ? "default"
                    : "primary"
                }
                icon={
                  showEditForm ? (
                    <CloseOutlined />
                  ) : (
                    <EditOutlined />
                  )
                }
                onClick={() =>
                  setShowEditForm(
                    (prev) => !prev,
                  )
                }
              >
                <span className="hidden sm:inline">
                  {showEditForm
                    ? "Đóng"
                    : "Chỉnh sửa trang cá nhân"}
                </span>

                <span className="sm:hidden">
                  {showEditForm
                    ? "Đóng"
                    : "Chỉnh sửa"}
                </span>
              </Button>
            </div>
          </div>

          {/* TABS */}

          <div className="yakiuo-profile-tabs">
            <button
              type="button"
              className="is-active"
            >
              Bài viết
            </button>

            <button type="button">
              Giới thiệu
            </button>

            <button type="button">
              Hoa hồng
            </button>

            <button type="button">
              Ảnh
            </button>
          </div>
        </div>
      </section>

      {/* =================================================
          BODY
      ================================================= */}

      <div className="yakiuo-profile-body">
        <div className="yakiuo-profile-grid">
          {/* =================================================
              LEFT COLUMN
          ================================================= */}

          <div className="yakiuo-profile-left">
            {/* INTRO */}

            <Card
              bordered={false}
              className="yakiuo-social-card"
            >
              <div className="yakiuo-card-title">
                Giới thiệu
              </div>

              <div className="yakiuo-intro-role">
                {role.label}
              </div>

              <div className="yakiuo-intro-list">
                <div>
                  <UserOutlined />
                  <span>
                    @{user?.username ||
                      "—"}
                  </span>
                </div>

                <div>
                  <MailOutlined />
                  <span>
                    {user?.email ||
                      "Chưa cập nhật"}
                  </span>
                </div>

                <div>
                  <PhoneOutlined />
                  <span>
                    {user?.phone ||
                      "Chưa cập nhật"}
                  </span>
                </div>

                <div>
                  <SafetyOutlined />
                  <span>
                    Tài khoản{" "}
                    {user?.status ===
                    "active"
                      ? "đang hoạt động"
                      : "đã bị khóa"}
                  </span>
                </div>
              </div>
            </Card>

            {/* ACCOUNT EDIT */}

            {showEditForm && (
              <Card
                bordered={false}
                className="yakiuo-social-card"
              >
                <div className="yakiuo-card-heading">
                  <div>
                    <div className="yakiuo-card-title">
                      Chỉnh sửa thông tin
                    </div>

                    <div className="yakiuo-card-subtitle">
                      Cập nhật thông tin cá nhân của bạn.
                    </div>
                  </div>
                </div>

                <Divider />

                <Form
                  form={form}
                  layout="vertical"
                  onFinish={handleSave}
                  requiredMark={false}
                >
                  <Form.Item
                    label="Họ và tên"
                    name="fullName"
                    rules={[
                      {
                        required: true,
                        message:
                          "Vui lòng nhập họ và tên",
                      },
                      {
                        min: 2,
                        message:
                          "Họ và tên phải có ít nhất 2 ký tự",
                      },
                    ]}
                  >
                    <Input
                      size="large"
                      prefix={
                        <UserOutlined />
                      }
                      placeholder="Nhập họ và tên"
                    />
                  </Form.Item>

                  <Form.Item
                    label="Email"
                    name="email"
                  >
                    <Input
                      size="large"
                      prefix={
                        <MailOutlined />
                      }
                      disabled
                    />
                  </Form.Item>

                  <Form.Item
                    label="Số điện thoại"
                    name="phone"
                  >
                    <Input
                      size="large"
                      prefix={
                        <PhoneOutlined />
                      }
                      placeholder="Nhập số điện thoại"
                    />
                  </Form.Item>

                  <Form.Item label="Quyền tài khoản">
                    <Input
                      size="large"
                      prefix={
                        <SafetyOutlined />
                      }
                      value={role.label}
                      disabled
                    />
                  </Form.Item>

                  <div className="flex justify-end">
                    <Button
                      type="primary"
                      size="large"
                      htmlType="submit"
                      icon={
                        <SaveOutlined />
                      }
                      loading={saving}
                    >
                      Lưu thay đổi
                    </Button>
                  </div>
                </Form>
              </Card>
            )}
          </div>

          {/* =================================================
              RIGHT COLUMN
          ================================================= */}

          <div className="yakiuo-profile-right">
            {/* POST / PROFILE INFO */}

            <Card
              bordered={false}
              className="yakiuo-social-card"
            >
              <div className="yakiuo-card-heading">
                <div className="yakiuo-card-title">
                  Thông tin tài khoản
                </div>

                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() =>
                    setShowEditForm(true)
                  }
                >
                  Chỉnh sửa
                </Button>
              </div>

              <div className="yakiuo-info-grid">
                <div className="yakiuo-info-box">
                  <span>
                    Username
                  </span>

                  <strong>
                    @{user?.username ||
                      "—"}
                  </strong>
                </div>

                <div className="yakiuo-info-box">
                  <span>
                    Email
                  </span>

                  <strong>
                    {user?.email ||
                      "—"}
                  </strong>
                </div>

                <div className="yakiuo-info-box">
                  <span>
                    Điện thoại
                  </span>

                  <strong>
                    {user?.phone ||
                      "Chưa cập nhật"}
                  </strong>
                </div>

                <div className="yakiuo-info-box">
                  <span>
                    Vai trò
                  </span>

                  <strong>
                    {role.label}
                  </strong>
                </div>
              </div>
            </Card>

            {/* COMMISSION */}

            <Card
              bordered={false}
              className="yakiuo-social-card"
            >
              <div className="yakiuo-card-heading">
                <div>
                  <div className="yakiuo-card-title">
                    Hoa hồng
                  </div>

                  <div className="yakiuo-card-subtitle">
                    Theo dõi hoa hồng của bạn.
                  </div>
                </div>

                <DollarOutlined className="yakiuo-card-icon" />
              </div>

              <Divider />

              <Commission />
            </Card>

            {/* NORMAL COMMISSION */}

            <Card
              bordered={false}
              className="yakiuo-social-card"
            >
              <div className="yakiuo-card-heading">
                <div className="flex items-center gap-3">
                  <div className="yakiuo-small-icon">
                    <DollarOutlined />
                  </div>

                  <div>
                    <div className="yakiuo-card-title">
                      Commission
                    </div>

                    <div className="yakiuo-card-subtitle">
                      Hoa hồng thông thường
                    </div>
                  </div>
                </div>

                <Tag color="default">
                  Chờ backend
                </Tag>
              </div>

              <Divider />

              <div className="yakiuo-empty-commission">
                <div className="yakiuo-empty-money">
                  —
                </div>

                <div>
                  <strong>
                    Chưa có dữ liệu
                  </strong>

                  <span>
                    Dữ liệu commission sẽ được cập nhật khi backend sẵn sàng.
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;