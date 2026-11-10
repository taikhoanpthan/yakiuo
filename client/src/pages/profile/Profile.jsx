import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../store/AuthContext";

import {
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
  LinkOutlined,
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
  removeMyAvatar,
} from "../../services/user.service";

import Commission from "../commission/Commission";
import CommissionGG from "../commission/CommissionGG";
import TrashBin from "./TrashBin";
import HamsterLoader from "../../components/common/HamsterLoader";

const toSliderNumber = (value, fallback, min, max) => {
  const candidate = Array.isArray(value) ? value[0] : value;
  const number = Number(candidate);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};

const getImageTransform = (position, zoom) => {
  const safeZoom = toSliderNumber(zoom, 1, 1, 2.5);
  const x = toSliderNumber(position?.x, 50, 0, 100);
  const y = toSliderNumber(position?.y, 50, 0, 100);
  // Khi ảnh gốc vuông, object-position không có vùng dư để dịch chuyển.
  // Dịch phần ảnh đã zoom giúp thanh căn chỉnh luôn phản hồi đúng.
  const offsetX = (50 - x) * (safeZoom - 1);
  const offsetY = (50 - y) * (safeZoom - 1);
  return `translate(${offsetX}%, ${offsetY}%) scale(${safeZoom})`;
};

const Profile = () => {
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const { user: authUser, updateUser } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: user,
    isLoading,
    error: profileError,
  } = useQuery({
    queryKey: ["user", "me"],
    queryFn: async () => {
      const response = await getMe();
      const currentUser = response?.data?.user;

      if (!currentUser) {
        throw new Error("Không tìm thấy thông tin người dùng");
      }

      return currentUser;
    },
    // AuthContext đã tải hồ sơ khi ứng dụng khởi động. Dùng ngay dữ liệu đó
    // để quay lại Profile không bị thay cả trang bằng màn hình loading.
    initialData: authUser || undefined,
  });

  const syncUser = (nextUser) => {
    if (!nextUser) return;
    const mergedUser = {
      ...(queryClient.getQueryData(["user", "me"]) || authUser || {}),
      ...nextUser,
    };
    queryClient.setQueryData(["user", "me"], mergedUser);
    updateUser(mergedUser);
  };

  const canEditAccountIdentity = ["admin", "manager", "premium"].includes(
    user?.role,
  );

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingShowcase, setUploadingShowcase] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [showEditForm, setShowEditForm] = useState(false);

  // Xem avatar
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showAvatarUrlModal, setShowAvatarUrlModal] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [showShowcaseUrlModal, setShowShowcaseUrlModal] = useState(false);
  const [showcaseImageUrl, setShowcaseImageUrl] = useState("");
  const [showcaseIndex, setShowcaseIndex] = useState(0);
  const [imageAdjustTarget, setImageAdjustTarget] = useState(null);
  const [imagePosition, setImagePosition] = useState({ x: 50, y: 50 });
  const [imageZoom, setImageZoom] = useState(1);
  const [savingImagePosition, setSavingImagePosition] = useState(false);
  const showcaseImages = Array.isArray(user?.profileShowcaseImages) && user.profileShowcaseImages.length
    ? user.profileShowcaseImages
    : user?.profileShowcaseImage ? [user.profileShowcaseImage] : [];

  useEffect(() => {
    if (showcaseIndex >= showcaseImages.length) setShowcaseIndex(0);
  }, [showcaseImages.length, showcaseIndex]);

  useEffect(() => {
    if (user?.role !== "admin" || showcaseImages.length < 2) return undefined;
    const timer = window.setTimeout(() => {
      setShowcaseIndex((current) => (current + 1) % showcaseImages.length);
    }, 3500);
    return () => window.clearTimeout(timer);
  }, [user?.role, showcaseImages.length, showcaseIndex]);

  useEffect(() => {
    if (!user) return;
    updateUser(user);
    form.setFieldsValue({
      username: user.username || "",
      email: user.email || "",
      fullName: user.fullName || "",
      phone: user.phone || "",
    });
  }, [form, updateUser, user]);

  useEffect(() => {
    if (!profileError) return;
    console.error("Get profile failed:", profileError);
    message.error(
      profileError.response?.data?.message ||
        profileError.message ||
        "Không thể tải thông tin cá nhân",
    );
  }, [profileError]);

  // =====================================================
  // UPLOAD AVATAR
  // =====================================================

  const handleUploadAvatar = async ({ file, onSuccess, onError }) => {
    try {
      if (!file.type?.startsWith("image/")) {
        throw new Error("Chỉ được upload file hình ảnh");
      }

      if (file.size > 10 * 1024 * 1024) {
        throw new Error("Ảnh không được vượt quá 10MB");
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
      syncUser({ avatar });

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

  const handleRemoveAvatar = async () => {
    try {
      setUploading(true);
      const response = await removeMyAvatar();
      const updatedUser = response?.data?.user;
      syncUser({
        ...(updatedUser || {}),
        avatar: "",
        avatarPosition: { x: 50, y: 50 },
        avatarZoom: 1,
      });
      setShowAvatarModal(false);
      setImageAdjustTarget(null);
      message.success("Đã trở về ảnh đại diện mặc định");
    } catch (error) {
      message.error(error.response?.data?.message || "Không thể xóa ảnh đại diện");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveAvatarUrl = async () => {
    const normalizedUrl = avatarUrl.trim();

    try {
      const parsedUrl = new URL(normalizedUrl);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Chỉ hỗ trợ link ảnh http hoặc https");
      }

      setUploading(true);
      const response = await updateMyProfile({ avatar: parsedUrl.href });
      const updatedUser = response?.data?.user;

      if (!updatedUser) {
        throw new Error("Không nhận được dữ liệu ảnh đại diện");
      }

      syncUser(updatedUser);
      setShowAvatarUrlModal(false);
      setAvatarUrl("");
      message.success("Đã cập nhật ảnh đại diện từ link");
    } catch (error) {
      message.error(
        error.response?.data?.message ||
          error.message ||
          "Không thể cập nhật ảnh đại diện từ link",
      );
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

      if (file.size > 10 * 1024 * 1024) {
        throw new Error("Ảnh không được vượt quá 10MB");
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

      syncUser({ coverImage });
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

  const handleUploadShowcase = async ({ file, onSuccess, onError }) => {
    try {
      if (!file.type?.startsWith("image/")) {
        throw new Error("Chỉ được upload file hình ảnh");
      }

      if (file.size > 10 * 1024 * 1024) {
        throw new Error("Ảnh không được vượt quá 10MB");
      }

      setUploadingShowcase(true);
      const formData = new FormData();
      formData.append("image", file);
      formData.append("type", "profile");

      const response = await api.post("/upload/image", formData);
      const profileShowcaseImages = response?.data?.data?.profileShowcaseImages;

      if (!Array.isArray(profileShowcaseImages)) {
        throw new Error("Không nhận được URL ảnh hiển thị");
      }

      syncUser({ profileShowcaseImages, profileShowcaseImage: profileShowcaseImages.at(-1) || "" });
      message.success("Đã cập nhật ảnh hiển thị trang cá nhân");
      onSuccess?.(response.data);
    } catch (error) {
      message.error(
        error.response?.data?.message ||
          error.message ||
          "Không thể tải ảnh hiển thị",
      );
      onError?.(error);
    } finally {
      setUploadingShowcase(false);
    }
  };

  const handleSaveShowcaseUrl = async () => {
    const normalizedUrl = showcaseImageUrl.trim();

    try {
      const parsedUrl = new URL(normalizedUrl);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Chỉ hỗ trợ link ảnh http hoặc https");
      }

      setUploadingShowcase(true);
      const response = await updateMyProfile({
        profileShowcaseImage: parsedUrl.href,
      });
      const updatedUser = response?.data?.user;

      if (!updatedUser) {
        throw new Error("Không nhận được dữ liệu ảnh hiển thị");
      }

      syncUser(updatedUser);
      setShowShowcaseUrlModal(false);
      setShowcaseImageUrl("");
      message.success("Đã cập nhật ảnh hiển thị từ link");
    } catch (error) {
      message.error(
        error.response?.data?.message ||
          error.message ||
          "Không thể cập nhật ảnh hiển thị từ link",
      );
    } finally {
      setUploadingShowcase(false);
    }
  };

  const handleRemoveShowcaseImage = async (imageUrl) => {
    try {
      setUploadingShowcase(true);
      const response = await updateMyProfile({ profileShowcaseImageToRemove: imageUrl });
      const updatedUser = response?.data?.user;
      if (!updatedUser) throw new Error("Không nhận được dữ liệu ảnh hiển thị");
      syncUser(updatedUser);
      message.success("Đã xóa ảnh hiển thị");
    } catch (error) {
      message.error(error.response?.data?.message || error.message || "Không thể xóa ảnh hiển thị");
    } finally {
      setUploadingShowcase(false);
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

      syncUser(updatedUser);

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
    setImagePosition({
      x: toSliderNumber(position?.x, 50, 0, 100),
      y: toSliderNumber(position?.y, 50, 0, 100),
    });
    // Cần một khoảng crop nhỏ để căn ngang/dọc có tác dụng ngay khi mở.
    const savedZoom = target === "avatar" ? user?.avatarZoom : user?.coverZoom;
    setImageZoom(Math.max(target === "avatar" ? 1.1 : 1, toSliderNumber(savedZoom, 1, 1, 2.5)));
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

      syncUser(updatedUser);
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
  const isAdmin = user?.role === "admin";

  // =====================================================
  // LOADING
  // =====================================================

  if (isLoading && !user) {
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
                  transformOrigin: "center",
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
                  <div className="yakiuo-profile-avatar">
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.fullName || "Avatar"}
                        style={{
                          objectPosition: `${toSliderNumber(user.avatarPosition?.x, 50, 0, 100)}% ${toSliderNumber(user.avatarPosition?.y, 50, 0, 100)}%`,
                          transform: getImageTransform(user.avatarPosition, user.avatarZoom),
                        }}
                      />
                    ) : (
                      <UserOutlined />
                    )}
                  </div>
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

                <button
                  type="button"
                  className="yakiuo-avatar-url"
                  disabled={uploading}
                  title="Dán link ảnh đại diện"
                  onClick={() => {
                    setAvatarUrl(user?.avatar || "");
                    setShowAvatarUrlModal(true);
                  }}
                >
                  <LinkOutlined />
                </button>

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
          {isAdmin && (
            <section className="yakiuo-admin-showcase">
              {showcaseImages.length ? (
                showcaseImages.map((image, index) => (
                  <img
                    key={image}
                    src={image}
                    alt="Ảnh hiển thị trang cá nhân"
                    className={`yakiuo-admin-showcase-image${index === showcaseIndex ? " is-active" : ""}`}
                  />
                ))
              ) : (
                <div className="yakiuo-admin-showcase-empty">
                  Tải một ảnh để hiển thị trên trang cá nhân
                </div>
              )}
              <Upload
                showUploadList={false}
                accept="image/png,image/jpeg,image/webp"
                customRequest={handleUploadShowcase}
              >
                <Button
                  className="yakiuo-admin-showcase-upload"
                  icon={<CameraOutlined />}
                  loading={uploadingShowcase}
                >
                  {showcaseImages.length ? "Thêm ảnh" : "Tải ảnh hiển thị"}
                </Button>
              </Upload>
              <Button
                className="yakiuo-admin-showcase-url"
                icon={<LinkOutlined />}
                onClick={() => {
                  setShowcaseImageUrl(user?.profileShowcaseImage || "");
                  setShowShowcaseUrlModal(true);
                }}
              >
                Dán link ảnh
              </Button>
              {showcaseImages.length > 1 && (
                <div className="yakiuo-admin-showcase-dots" aria-label={`Ảnh ${showcaseIndex + 1} trên ${showcaseImages.length}`}>
                  {showcaseImages.map((image, index) => (
                    <button key={image} type="button" className={index === showcaseIndex ? "is-active" : ""} onClick={() => setShowcaseIndex(index)} aria-label={`Xem ảnh ${index + 1}`} />
                  ))}
                </div>
              )}
              {showcaseImages.length > 0 && (
                <Button danger className="yakiuo-admin-showcase-delete" icon={<CloseOutlined />} loading={uploadingShowcase} onClick={() => Modal.confirm({ title: "Xóa ảnh hiển thị?", content: "Ảnh này sẽ không còn xuất hiện trên trang cá nhân.", okText: "Xóa ảnh", cancelText: "Hủy", okButtonProps: { danger: true }, onOk: () => handleRemoveShowcaseImage(showcaseImages[showcaseIndex]) })}>
                  Xóa ảnh
                </Button>
              )}
            </section>
          )}

          {!isAdmin && <div className="yakiuo-profile-grid">
            {/* =================================================
                LEFT
            ================================================= */}

            {!isAdmin && <div className="yakiuo-profile-left">
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

              <CommissionGG />

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
            </div>}

            {/* =================================================
                RIGHT
            ================================================= */}

            <div className="yakiuo-profile-right">
              {!isAdmin && <>
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

                <TrashBin />
                </>}
            </div>
          </div>}
        </div>
      </div>

      {/* =====================================================
          AVATAR VIEW MODAL
      ===================================================== */}

      <Modal
        title="Dán link ảnh hiển thị"
        open={showShowcaseUrlModal}
        onCancel={() => {
          if (uploadingShowcase) return;
          setShowShowcaseUrlModal(false);
        }}
        onOk={handleSaveShowcaseUrl}
        okText="Lưu ảnh"
        cancelText="Hủy"
        confirmLoading={uploadingShowcase}
        centered
        destroyOnHidden
      >
        <p className="mb-3 text-sm text-slate-500">
          Dán đường dẫn trực tiếp đến ảnh (http hoặc https).
        </p>
        <Input
          autoFocus
          value={showcaseImageUrl}
          onChange={(event) => setShowcaseImageUrl(event.target.value)}
          onPressEnter={handleSaveShowcaseUrl}
          prefix={<LinkOutlined />}
          placeholder="https://example.com/anh-hien-thi.jpg"
          maxLength={2048}
        />
      </Modal>

      <Modal
        title="Dán link ảnh đại diện"
        open={showAvatarUrlModal}
        onCancel={() => {
          if (uploading) return;
          setShowAvatarUrlModal(false);
        }}
        onOk={handleSaveAvatarUrl}
        okText="Lưu ảnh"
        cancelText="Hủy"
        confirmLoading={uploading}
        centered
        destroyOnHidden
      >
        <p className="mb-3 text-sm text-slate-500">
          Dán đường dẫn trực tiếp đến ảnh (http hoặc https).
        </p>
        <Input
          autoFocus
          value={avatarUrl}
          onChange={(event) => setAvatarUrl(event.target.value)}
          onPressEnter={handleSaveAvatarUrl}
          prefix={<LinkOutlined />}
          placeholder="https://example.com/avatar.jpg"
          maxLength={2048}
        />
      </Modal>

      <Modal
        className="yakiuo-avatar-preview-modal"
        open={showAvatarModal}
        onCancel={() => setShowAvatarModal(false)}
        footer={null}
        centered
        destroyOnHidden
        width="min(700px, calc(100vw - 32px))"
      >
        <div className="yakiuo-avatar-preview-frame">
          {user?.avatar && (
            <img
              src={user.avatar}
              alt={user?.fullName || "Avatar"}
              className="yakiuo-avatar-preview-image"
            />
          )}
        </div>
        <div className="yakiuo-avatar-preview-actions">
          <Button icon={<DragOutlined />} onClick={() => openImageAdjuster("avatar")}>
            Căn chỉnh
          </Button>
          <Button
            danger
            icon={<CloseOutlined />}
            loading={uploading}
            onClick={() => Modal.confirm({
              title: "Xóa ảnh đại diện?",
              content: "Ảnh đại diện sẽ trở về biểu tượng mặc định.",
              okText: "Xóa ảnh",
              okButtonProps: { danger: true },
              cancelText: "Hủy",
              onOk: handleRemoveAvatar,
            })}
          >
            Xóa ảnh
          </Button>
        </div>
      </Modal>

      <Modal
        className="yakiuo-image-adjust-modal"
        title={null}
        open={Boolean(imageAdjustTarget)}
        onCancel={() => setImageAdjustTarget(null)}
        onOk={handleSaveImagePosition}
        okText="Lưu vị trí"
        cancelText="Hủy"
        confirmLoading={savingImagePosition}
        centered
      >
        <div className="yakiuo-image-adjust-heading">
          Căn chỉnh {imageAdjustTarget === "cover" ? "ảnh bìa" : "ảnh đại diện"}
        </div>
        <div className="yakiuo-image-adjust-content">
          {imageAdjustTarget === "cover" ? (
            <div className="relative h-40 overflow-hidden rounded-xl bg-slate-200">
              <img
                src={user?.coverImage}
                alt="Xem trước ảnh bìa"
                className="h-full w-full object-cover"
                style={{
                  objectPosition: `${imagePosition.x}% ${imagePosition.y}%`,
                  transform: getImageTransform(imagePosition, imageZoom),
                  transformOrigin: "center",
                }}
              />
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="h-40 w-40 overflow-hidden rounded-full bg-slate-100">
                <img
                  src={user?.avatar}
                  alt="Xem trước ảnh đại diện"
                  className="h-full w-full object-cover"
                  style={{
                    objectPosition: `${imagePosition.x}% ${imagePosition.y}%`,
                    transform: getImageTransform(imagePosition, imageZoom),
                    transformOrigin: "center",
                  }}
                />
              </div>
            </div>
          )}

          <div className="mt-6">
            <div className="mb-2 text-sm font-medium text-slate-700">
              Căn ngang
            </div>
            <Slider
              value={toSliderNumber(imagePosition.x, 50, 0, 100)}
              onChange={(x) => setImagePosition((prev) => ({ ...prev, x: toSliderNumber(x, prev.x, 0, 100) }))}
            />
          </div>
          <div className="mt-4">
            <div className="mb-2 text-sm font-medium text-slate-700">
              Căn dọc
            </div>
            <Slider
              value={toSliderNumber(imagePosition.y, 50, 0, 100)}
              onChange={(y) => setImagePosition((prev) => ({ ...prev, y: toSliderNumber(y, prev.y, 0, 100) }))}
            />
          </div>
          <div className="mt-4">
            <div className="mb-2 flex justify-between text-sm font-medium text-slate-700">
              <span>Thu phóng</span>
              <span>{toSliderNumber(imageZoom, 1, 1, 2.5).toFixed(2)}×</span>
            </div>
            <Slider
              min={1}
              max={2.5}
              step={0.05}
              value={toSliderNumber(imageZoom, 1, 1, 2.5)}
              onChange={(zoom) => setImageZoom(toSliderNumber(zoom, 1, 1, 2.5))}
            />
          </div>
        </div>
      </Modal>
    </>
  );
};

export default Profile;
