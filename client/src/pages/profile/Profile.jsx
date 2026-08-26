import { useEffect, useState } from "react";
import { useAuth } from "../../store/AuthContext";

import {
  Avatar,
  Button,
  Card,
  Divider,
  Form,
  Input,
  Modal,
  Tag,
  Upload,
  message,
} from "antd";

import {
  CameraOutlined,
  CheckCircleFilled,
  CloseOutlined,
  DollarOutlined,
  EditOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  SafetyOutlined,
  SaveOutlined,
  UserOutlined,
} from "@ant-design/icons";

import api from "../../services/api";

import { getMe, updateUser, changePassword } from "../../services/user.service";

import Commission from "../commission/Commission";

const Profile = () => {
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const { user: authUser, updateUser } = useAuth();

  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [showEditForm, setShowEditForm] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Xem avatar
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  // =====================================================
  // GET CURRENT USER
  // =====================================================

  const fetchProfile = async () => {
    try {
      setLoading(true);

      const response = await getMe();

      const currentUser = response?.data?.user;

      if (!currentUser) {
        throw new Error("Không tìm thấy thông tin người dùng");
      }

      setUser(currentUser);
      updateUser(currentUser);

      form.setFieldsValue({
        fullName: currentUser.fullName || "",
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

  // =====================================================
  // UPLOAD AVATAR
  // =====================================================

  const handleUploadAvatar = async ({ file, onSuccess, onError }) => {
    try {
      if (!file.type?.startsWith("image/")) {
        throw new Error("Chỉ được upload file hình ảnh");
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Ảnh không được vượt quá 5MB");
      }

      setUploading(true);

      const formData = new FormData();
      formData.append("image", file);

      const response = await api.post("/upload/image", formData);

      const avatar = response?.data?.data?.avatar;

      if (!avatar) {
        throw new Error("Không nhận được URL avatar");
      }

      // Cập nhật Profile
      setUser((prev) => ({
        ...prev,
        avatar,
      }));

      // Cập nhật AuthContext
      // => Navbar desktop/mobile đổi ngay
      updateUser({
        avatar,
      });

      // Nếu đang mở avatar modal thì cũng dùng
      // user mới ở lần render tiếp theo

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

  // =====================================================
  // UPDATE PROFILE
  // =====================================================

  const handleSave = async (values) => {
    if (!user?._id) {
      message.error("Không tìm thấy người dùng");
      return;
    }

    try {
      setSaving(true);

      const response = await updateUser(user._id, {
        fullName: values.fullName?.trim() || "",
        phone: values.phone?.trim() || "",
      });

      const updatedUser = response?.data?.user;

      if (!updatedUser) {
        throw new Error("Không nhận được dữ liệu người dùng");
      }

      setUser(updatedUser);

      form.setFieldsValue({
        fullName: updatedUser.fullName || "",
        phone: updatedUser.phone || "",
      });

      message.success("Đã cập nhật thông tin cá nhân");

      setShowEditForm(false);
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

  // =====================================================
  // CHANGE PASSWORD
  // =====================================================

  const handleChangePassword = async (values) => {
    try {
      setChangingPassword(true);

      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      message.success("Đã cập nhật mật khẩu thành công");

      passwordForm.resetFields();

      setShowPasswordModal(false);
    } catch (error) {
      console.error("Change password failed:", error);

      message.error(
        error.response?.data?.message ||
          error.message ||
          "Không thể cập nhật mật khẩu",
      );
    } finally {
      setChangingPassword(false);
    }
  };

  // =====================================================
  // PASSWORD MODAL
  // =====================================================

  const openPasswordModal = () => {
    passwordForm.resetFields();
    setShowPasswordModal(true);
  };

  const closePasswordModal = () => {
    if (changingPassword) return;

    passwordForm.resetFields();
    setShowPasswordModal(false);
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

  const role = roleConfig[user?.role] || {
    label: user?.role?.toUpperCase() || "USER",
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
    <>
      <div className="yakiuo-profile pb-28 lg:pb-0">
        {/* =================================================
            PROFILE HEADER
        ================================================= */}

        <section className="yakiuo-profile-header">
          {/* COVER */}

          <div className="yakiuo-cover relative">
            <div className="yakiuo-cover-overlay" />

            {/* CENTER TITLE */}

            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <span className="yakiuo-cover-title text-center text-white">
                NÔ LỆ TƯ BẢN
              </span>
            </div>
          </div>

          {/* PROFILE INFO */}

          <div className="yakiuo-profile-info">
            <div className="yakiuo-profile-main">
              {/* =================================================
                  AVATAR
              ================================================= */}

              <div className="yakiuo-avatar-wrapper">
                {/* AVATAR */}

                <div
                  className={user?.avatar ? "cursor-pointer" : "cursor-default"}
                  onClick={() => {
                    if (user?.avatar) {
                      setShowAvatarModal(true);
                    }
                  }}
                >
                  <Avatar
                    className="yakiuo-profile-avatar"
                    src={user?.avatar || undefined}
                    icon={!user?.avatar && <UserOutlined />}
                  >
                    {!user?.avatar && user?.fullName?.charAt(0)?.toUpperCase()}
                  </Avatar>
                </div>

                {/* CAMERA */}

                <Upload
                  showUploadList={false}
                  accept="image/png,image/jpeg,image/webp"
                  customRequest={handleUploadAvatar}
                >
                  <button
                    type="button"
                    className="yakiuo-avatar-camera"
                    disabled={uploading}
                    title="Đổi ảnh đại diện"
                  >
                    <CameraOutlined />
                  </button>
                </Upload>
              </div>

              {/* =================================================
                  IDENTITY
              ================================================= */}

              <div className="yakiuo-profile-identity">
                <div className="yakiuo-profile-name-row">
                  <h1>{user?.fullName || "Chưa cập nhật"}</h1>

                  {user?.status === "active" && (
                    <CheckCircleFilled className="yakiuo-verified" />
                  )}
                </div>

                <div className="yakiuo-profile-username">
                  @{user?.username || "username"}
                </div>

                <div className="yakiuo-profile-meta">
                  <Tag color={role.color}>{role.label}</Tag>

                  <span>
                    <span className="yakiuo-online-dot" />

                    {user?.status === "active"
                      ? "Đang hoạt động"
                      : "Tài khoản bị khóa"}
                  </span>
                </div>
              </div>

              {/* =================================================
                  ACTION
              ================================================= */}

              <div className="yakiuo-profile-actions">
                <Button
                  type={showEditForm ? "default" : "primary"}
                  icon={showEditForm ? <CloseOutlined /> : <EditOutlined />}
                  onClick={() => setShowEditForm((prev) => !prev)}
                >
                  <span className="hidden sm:inline">
                    {showEditForm ? "Đóng" : "Chỉnh sửa"}
                  </span>

                  <span className="sm:hidden">
                    {showEditForm ? "Đóng" : "Sửa"}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            BODY
        ================================================= */}

        <div className="yakiuo-profile-body">
          <div className="yakiuo-profile-grid">
            {/* =================================================
                LEFT
            ================================================= */}

            <div className="yakiuo-profile-left">
              {/* INTRO */}

              <Card bordered={false} className="yakiuo-social-card">
                <div className="yakiuo-card-title">Giới thiệu</div>

                <div className="yakiuo-intro-role">{role.label}</div>

                <div className="yakiuo-intro-list">
                  <div>
                    <UserOutlined />

                    <span>@{user?.username || "—"}</span>
                  </div>

                  <div>
                    <MailOutlined />

                    <span>{user?.email || "Chưa cập nhật"}</span>
                  </div>

                  <div>
                    <PhoneOutlined />

                    <span>{user?.phone || "Chưa cập nhật"}</span>
                  </div>

                  <div>
                    <SafetyOutlined />

                    <span>
                      Tài khoản{" "}
                      {user?.status === "active"
                        ? "đang hoạt động"
                        : "đã bị khóa"}
                    </span>
                  </div>
                </div>
              </Card>

              {/* EDIT PROFILE */}

              {showEditForm && (
                <Card bordered={false} className="yakiuo-social-card">
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

                    <Form.Item label="Số điện thoại" name="phone">
                      <Input
                        size="large"
                        prefix={<PhoneOutlined />}
                        placeholder="Nhập số điện thoại"
                      />
                    </Form.Item>

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
              )}
            </div>

            {/* =================================================
                RIGHT
            ================================================= */}

            <div className="yakiuo-profile-right">
              {/* SECURITY */}

              <Card bordered={false} className="yakiuo-social-card">
                <div className="yakiuo-card-heading">
                  <div className="flex items-center gap-3">
                    <div className="yakiuo-small-icon">
                      <LockOutlined />
                    </div>

                    <div>
                      <div className="yakiuo-card-title">Bảo mật tài khoản</div>

                      <div className="yakiuo-card-subtitle">
                        Quản lý mật khẩu đăng nhập.
                      </div>
                    </div>
                  </div>

                  <SafetyOutlined className="yakiuo-card-icon" />
                </div>

                <Divider />

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-semibold text-slate-900">Mật khẩu</div>

                    <div className="mt-1 text-sm text-slate-500">
                      Nên thay đổi mật khẩu định kỳ để bảo vệ tài khoản.
                    </div>
                  </div>

                  <Button icon={<LockOutlined />} onClick={openPasswordModal}>
                    Đổi mật khẩu
                  </Button>
                </div>
              </Card>

              {/* COMMISSION */}

              <Card bordered={false} className="yakiuo-social-card">
                <div className="yakiuo-card-heading">
                  <div>
                    <div className="yakiuo-card-title">Hoa hồng</div>

                    <div className="yakiuo-card-subtitle">
                      Theo dõi hoa hồng của bạn.
                    </div>
                  </div>

                  <DollarOutlined className="yakiuo-card-icon" />
                </div>

                <Divider />

                <Commission />
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          AVATAR VIEW MODAL
      ===================================================== */}

      <Modal
        open={showAvatarModal}
        onCancel={() => setShowAvatarModal(false)}
        footer={null}
        centered
        destroyOnHidden
        width="min(700px, calc(100vw - 32px))"
        styles={{
          content: {
            padding: 8,
            background: "#000",
          },
          body: {
            padding: 0,
          },
        }}
      >
        <div className="flex max-h-[80vh] min-h-[200px] items-center justify-center overflow-hidden rounded-lg bg-black">
          {user?.avatar && (
            <img
              src={user.avatar}
              alt={user?.fullName || "Avatar"}
              className="max-h-[80vh] w-auto max-w-full object-contain"
            />
          )}
        </div>
      </Modal>

      {/* =====================================================
          CHANGE PASSWORD MODAL
      ===================================================== */}

      <Modal
        title={
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <LockOutlined />
            </div>

            <div>
              <div className="text-base font-semibold text-slate-900">
                Đổi mật khẩu
              </div>

              <div className="text-xs font-normal text-slate-500">
                Cập nhật mật khẩu tài khoản
              </div>
            </div>
          </div>
        }
        open={showPasswordModal}
        onCancel={closePasswordModal}
        footer={null}
        destroyOnHidden
        centered
        width={460}
      >
        <Divider />

        <Form
          form={passwordForm}
          layout="vertical"
          requiredMark={false}
          onFinish={handleChangePassword}
        >
          <Form.Item
            label="Mật khẩu hiện tại"
            name="currentPassword"
            rules={[
              {
                required: true,
                message: "Vui lòng nhập mật khẩu hiện tại",
              },
            ]}
          >
            <Input.Password
              size="large"
              prefix={<LockOutlined />}
              placeholder="Nhập mật khẩu hiện tại"
              iconRender={(visible) =>
                visible ? <EyeOutlined /> : <EyeInvisibleOutlined />
              }
            />
          </Form.Item>

          <Form.Item
            label="Mật khẩu mới"
            name="newPassword"
            rules={[
              {
                required: true,
                message: "Vui lòng nhập mật khẩu mới",
              },
              {
                min: 6,
                message: "Mật khẩu phải có ít nhất 6 ký tự",
              },
            ]}
            hasFeedback
          >
            <Input.Password
              size="large"
              prefix={<LockOutlined />}
              placeholder="Nhập mật khẩu mới"
              iconRender={(visible) =>
                visible ? <EyeOutlined /> : <EyeInvisibleOutlined />
              }
            />
          </Form.Item>

          <Form.Item
            label="Xác nhận mật khẩu mới"
            name="confirmPassword"
            dependencies={["newPassword"]}
            rules={[
              {
                required: true,
                message: "Vui lòng xác nhận mật khẩu mới",
              },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) {
                    return Promise.resolve();
                  }

                  return Promise.reject(
                    new Error("Mật khẩu xác nhận không khớp"),
                  );
                },
              }),
            ]}
            hasFeedback
          >
            <Input.Password
              size="large"
              prefix={<LockOutlined />}
              placeholder="Nhập lại mật khẩu mới"
              iconRender={(visible) =>
                visible ? <EyeOutlined /> : <EyeInvisibleOutlined />
              }
            />
          </Form.Item>

          <div className="mt-6 flex justify-end gap-2">
            <Button
              size="large"
              onClick={closePasswordModal}
              disabled={changingPassword}
            >
              Hủy
            </Button>

            <Button
              type="primary"
              size="large"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={changingPassword}
            >
              Cập nhật mật khẩu
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  );
};

export default Profile;
