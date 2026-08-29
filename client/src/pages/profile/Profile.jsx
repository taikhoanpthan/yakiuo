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
  Slider,
  Tag,
  Upload,
  message,
} from "antd";

import {
  CameraOutlined,
  CheckCircleFilled,
  CloseOutlined,
  DollarOutlined,
  DragOutlined,
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

import {
  getMe,
  updateMyProfile,
  changePassword,
} from "../../services/user.service";

import Commission from "../commission/Commission";
import CommissionGG from "../commission/CommissionGG";
import HamsterLoader from "../../components/common/HamsterLoader";

const Profile = () => {
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const { updateUser } = useAuth();

  const [user, setUser] = useState(null);
  const canEditAccountIdentity = ["admin", "manager", "premium"].includes(
    user?.role,
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [showEditForm, setShowEditForm] = useState(false);

  // Xem avatar
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [imageAdjustTarget, setImageAdjustTarget] = useState(null);
  const [imagePosition, setImagePosition] = useState({ x: 50, y: 50 });
  const [imageZoom, setImageZoom] = useState(1);
  const [savingImagePosition, setSavingImagePosition] = useState(false);

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
        username: currentUser.username || "",
        email: currentUser.email || "",
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
  // UPLOAD COVER IMAGE
  // =====================================================

  const handleUploadCover = async ({ file, onSuccess, onError }) => {
    try {
      if (!file.type?.startsWith("image/")) {
        throw new Error("Chỉ được upload file hình ảnh");
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Ảnh không được vượt quá 5MB");
      }

      setUploadingCover(true);

      const formData = new FormData();
      formData.append("image", file);
      formData.append("type", "cover");

      const response = await api.post("/upload/image", formData);
      const coverImage = response?.data?.data?.coverImage;

      if (!coverImage) {
        throw new Error("Không nhận được URL ảnh bìa");
      }

      setUser((prev) => ({ ...prev, coverImage }));
      updateUser({ coverImage });
      message.success("Đã cập nhật ảnh bìa");
      onSuccess?.(response.data);
    } catch (error) {
      console.error("Upload cover failed:", error);
      message.error(
        error.response?.data?.message ||
          error.message ||
          "Không thể cập nhật ảnh bìa",
      );
      onError?.(error);
    } finally {
      setUploadingCover(false);
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

      const response = await updateMyProfile({
        ...(canEditAccountIdentity
          ? {
              username: values.username?.trim() || "",
              email: values.email?.trim() || "",
            }
          : {}),
        fullName: values.fullName?.trim() || "",
        phone: values.phone?.trim() || "",
      });

      const updatedUser = response?.data?.user;

      if (!updatedUser) {
        throw new Error("Không nhận được dữ liệu người dùng");
      }

      setUser(updatedUser);
      updateUser(updatedUser);

      form.setFieldsValue({
        username: updatedUser.username || "",
        email: updatedUser.email || "",
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

  const openImageAdjuster = (target) => {
    const position =
      target === "avatar" ? user?.avatarPosition : user?.coverPosition;
    setImagePosition({ x: position?.x ?? 50, y: position?.y ?? 50 });
    setImageZoom(
      target === "avatar" ? (user?.avatarZoom ?? 1) : (user?.coverZoom ?? 1),
    );
    setImageAdjustTarget(target);
  };

  const handleSaveImagePosition = async () => {
    if (!imageAdjustTarget) return;

    try {
      setSavingImagePosition(true);
      const positionField =
        imageAdjustTarget === "avatar" ? "avatarPosition" : "coverPosition";
      const zoomField =
        imageAdjustTarget === "avatar" ? "avatarZoom" : "coverZoom";
      const response = await updateMyProfile({
        [positionField]: imagePosition,
        [zoomField]: imageZoom,
      });
      const updatedUser = response?.data?.user;

      if (!updatedUser) throw new Error("Không thể lưu vị trí ảnh");

      setUser(updatedUser);
      updateUser(updatedUser);
      setImageAdjustTarget(null);
      message.success("Đã lưu vị trí ảnh");
    } catch (error) {
      message.error(
        error?.response?.data?.message ||
          error.message ||
          "Không thể lưu vị trí ảnh",
      );
    } finally {
      setSavingImagePosition(false);
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

    premium: {
      label: "PREMIUM",
      color: "purple",
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
      <div className="flex min-h-[500px] flex-col items-center justify-center gap-3">
        <HamsterLoader size="lg" />
        <div className="text-sm text-slate-500">Đang tải thông tin cá nhân...</div>
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

            {user?.coverImage && (
              <img
                src={user.coverImage}
                alt="Ảnh bìa"
                className="yakiuo-cover-image"
                style={{
                  objectPosition: `${user?.coverPosition?.x ?? 50}% ${user?.coverPosition?.y ?? 50}%`,
                  transform: `scale(${user?.coverZoom ?? 1})`,
                }}
              />
            )}

            <Upload
              showUploadList={false}
              accept="image/png,image/jpeg,image/webp"
              customRequest={handleUploadCover}
            >
              <Button
                className="yakiuo-cover-camera"
                icon={<CameraOutlined />}
                loading={uploadingCover}
              >
                Đổi ảnh bìa
              </Button>
            </Upload>

            {user?.coverImage && (
              <Button
                className="yakiuo-cover-adjust"
                icon={<DragOutlined />}
                onClick={() => openImageAdjuster("cover")}
              >
                Căn chỉnh
              </Button>
            )}
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
                    style={{
                      "--avatar-position": `${user?.avatarPosition?.x ?? 50}% ${user?.avatarPosition?.y ?? 50}%`,
                      "--avatar-zoom": user?.avatarZoom ?? 1,
                    }}
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

                {user?.avatar && (
                  <button
                    type="button"
                    className="yakiuo-avatar-adjust"
                    title="Căn chỉnh ảnh đại diện"
                    onClick={() => openImageAdjuster("avatar")}
                  >
                    <DragOutlined />
                  </button>
                )}
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
                  onClick={() => {
                    if (showEditForm && changingPassword) return;
                    if (showEditForm) passwordForm.resetFields();
                    setShowEditForm((prev) => !prev);
                  }}
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
                        Chỉnh sửa thông tin & bảo mật
                      </div>

                      <div className="yakiuo-card-subtitle">
                        Cập nhật thông tin cá nhân và mật khẩu tài khoản.
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
                    {canEditAccountIdentity && (
                      <>
                        <Form.Item
                          label="Tên đăng nhập"
                          name="username"
                          rules={[
                            {
                              required: true,
                              message: "Vui lòng nhập tên đăng nhập",
                            },
                            {
                              min: 3,
                              message: "Tên đăng nhập phải có ít nhất 3 ký tự",
                            },
                          ]}
                        >
                          <Input
                            size="large"
                            prefix={<UserOutlined />}
                            placeholder="Nhập tên đăng nhập"
                          />
                        </Form.Item>

                        <Form.Item
                          label="Email"
                          name="email"
                          rules={[
                            {
                              type: "email",
                              message: "Email không hợp lệ",
                            },
                          ]}
                        >
                          <Input
                            size="large"
                            prefix={<MailOutlined />}
                            placeholder="Nhập email"
                          />
                        </Form.Item>
                      </>
                    )}

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

                  <Divider />

                  <div className="mb-5">
                    <div className="flex items-center gap-3">
                      <div className="yakiuo-small-icon">
                        <LockOutlined />
                      </div>

                      <div>
                        <div className="font-semibold text-slate-900">
                          Đổi mật khẩu
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          Nên thay đổi mật khẩu định kỳ để bảo vệ tài khoản.
                        </div>
                      </div>
                    </div>
                  </div>

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
                        { min: 6, message: "Mật khẩu phải có ít nhất 6 ký tự" },
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
                            if (
                              !value ||
                              getFieldValue("newPassword") === value
                            )
                              return Promise.resolve();
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

                    <div className="flex justify-end">
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
                </Card>
              )}
            </div>

            {/* =================================================
                RIGHT
            ================================================= */}

            <div className="yakiuo-profile-right">
              {/* COMMISSION */}

              <Card bordered={false} className="yakiuo-social-card">
                <div className="yakiuo-card-heading">
                  <div>
                    <div className="yakiuo-card-title">Rượu / Bào Ngư</div>
                  </div>

                  <DollarOutlined className="yakiuo-card-icon" />
                </div>

                <Divider />
                <Commission />
              </Card>

              <CommissionGG />
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

      <Modal
        title={`Căn chỉnh ${imageAdjustTarget === "cover" ? "ảnh bìa" : "ảnh đại diện"}`}
        open={Boolean(imageAdjustTarget)}
        onCancel={() => setImageAdjustTarget(null)}
        onOk={handleSaveImagePosition}
        okText="Lưu vị trí"
        cancelText="Hủy"
        confirmLoading={savingImagePosition}
        centered
      >
        <div className="py-3">
          {imageAdjustTarget === "cover" ? (
            <div className="relative h-40 overflow-hidden rounded-xl bg-slate-200">
              <img
                src={user?.coverImage}
                alt="Xem trước ảnh bìa"
                className="h-full w-full object-cover"
                style={{
                  objectPosition: `${imagePosition.x}% ${imagePosition.y}%`,
                  transform: `scale(${imageZoom})`,
                }}
              />
            </div>
          ) : (
            <div className="flex justify-center">
              <img
                src={user?.avatar}
                alt="Xem trước ảnh đại diện"
                className="h-40 w-40 rounded-full bg-slate-100 object-cover"
                style={{
                  objectPosition: `${imagePosition.x}% ${imagePosition.y}%`,
                  transform: `scale(${imageZoom})`,
                }}
              />
            </div>
          )}

          <div className="mt-6">
            <div className="mb-2 text-sm font-medium text-slate-700">
              Căn ngang
            </div>
            <Slider
              value={imagePosition.x}
              onChange={(x) => setImagePosition((prev) => ({ ...prev, x }))}
            />
          </div>
          <div className="mt-4">
            <div className="mb-2 text-sm font-medium text-slate-700">
              Căn dọc
            </div>
            <Slider
              value={imagePosition.y}
              onChange={(y) => setImagePosition((prev) => ({ ...prev, y }))}
            />
          </div>
          <div className="mt-4">
            <div className="mb-2 flex justify-between text-sm font-medium text-slate-700">
              <span>Thu phóng</span>
              <span>{imageZoom.toFixed(2)}×</span>
            </div>
            <Slider
              min={1}
              max={2.5}
              step={0.05}
              value={imageZoom}
              onChange={setImageZoom}
            />
          </div>
        </div>
      </Modal>
    </>
  );
};

export default Profile;
