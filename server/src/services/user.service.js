const bcrypt = require("bcryptjs");
const User = require("../models/User");

const sanitizeUser = (user) => {
  const data = user.toObject ? user.toObject() : user;

  delete data.passwordHash;
  delete data.refreshTokenHash;
  delete data.__v;

  return data;
};

const getUsers = async ({ page = 1, limit = 20, search = "", role, status }) => {
  const currentPage = Math.max(Number(page) || 1, 1);
  const currentLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

  const skip = (currentPage - 1) * currentLimit;

  const filter = {};

  if (["employee", "premium", "manager", "admin"].includes(role)) {
    filter.role = role;
  }

  if (["active", "inactive"].includes(status)) {
    filter.status = status;
  }

  if (search.trim()) {
    const keyword = search.trim();

    filter.$or = [
      { username: { $regex: keyword, $options: "i" } },
      { email: { $regex: keyword, $options: "i" } },
      { fullName: { $regex: keyword, $options: "i" } },
      { phone: { $regex: keyword, $options: "i" } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("-passwordHash -refreshTokenHash -__v")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(currentLimit),

    User.countDocuments(filter),
  ]);

  return {
    users,
    pagination: {
      page: currentPage,
      limit: currentLimit,
      total,
      totalPages: Math.ceil(total / currentLimit),
    },
  };
};

// Hồ sơ tối thiểu cho danh sách người có thể nhắn tin.
const getChatUsers = async () => {
  return User.find({ status: "active" })
    .select("_id username fullName avatar")
    .sort({ fullName: 1, username: 1 })
    .lean();
};

const getUserById = async (userId) => {
  const user = await User.findById(userId).select(
    "-passwordHash -refreshTokenHash -__v",
  );

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

const createUser = async ({
  username,
  email,
  password,
  fullName,
  avatar = "",
  phone = "",
  role = "employee",
  status = "active",
}) => {
  const existingUsername = await User.findOne({
    username: username.trim(),
  });

  if (existingUsername) {
    throw new Error("Username already exists");
  }

  if (email) {
    const existingEmail = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (existingEmail) {
      throw new Error("Email already exists");
    }
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await User.create({
    username: username.trim(),
    email: email?.trim().toLowerCase() || undefined,
    passwordHash,
    fullName: fullName.trim(),
    avatar,
    phone,
    role,
    status,
  });

  return sanitizeUser(user);
};

const updateUser = async (
  userId,
  { username, email, fullName, avatar, phone, role, password },
) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  if (username !== undefined) {
    const normalizedUsername = username.trim();

    if (!normalizedUsername) {
      throw new Error("Username is required");
    }

    if (normalizedUsername !== user.username) {
      const existingUsername = await User.findOne({
        username: normalizedUsername,
        _id: { $ne: userId },
      });

      if (existingUsername) {
        throw new Error("Username already exists");
      }

      user.username = normalizedUsername;
    }
  }

  if (email !== undefined) {
    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedEmail !== user.email) {
      const existingEmail = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: userId },
      });

      if (existingEmail) {
        throw new Error("Email already exists");
      }

      user.email = normalizedEmail || undefined;
    }
  }

  if (fullName !== undefined) {
    user.fullName = fullName.trim();
  }

  if (avatar !== undefined) {
    user.avatar = avatar;
  }

  if (phone !== undefined) {
    user.phone = phone;
  }

  if (role !== undefined) {
    user.role = role;
  }

  if (password !== undefined && password.trim()) {
    if (password.trim().length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    user.passwordHash = await bcrypt.hash(password.trim(), 12);

    user.refreshTokenHash = null;
  }

  await user.save();

  return sanitizeUser(user);
};

const normalizeImagePosition = (position = {}) => ({
  x: Math.min(100, Math.max(0, Number.isFinite(Number(position.x)) ? Number(position.x) : 50)),
  y: Math.min(100, Math.max(0, Number.isFinite(Number(position.y)) ? Number(position.y) : 50)),
});

const normalizeImageZoom = (zoom) => Math.min(2.5, Math.max(1, Number(zoom) || 1));

// Người dùng chỉ cập nhật được hồ sơ và vị trí hiển thị ảnh của chính họ.
const updateOwnProfile = async (userId, { username, email, fullName, phone, avatarPosition, coverPosition, avatarZoom, coverZoom }) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  const canEditAccountIdentity = ["admin", "manager", "premium"].includes(user.role);

  if (username !== undefined) {
    if (!canEditAccountIdentity) throw new Error("Bạn không có quyền đổi tên đăng nhập");

    const normalizedUsername = username.trim();
    if (!normalizedUsername) throw new Error("Tên đăng nhập không được để trống");

    if (normalizedUsername !== user.username) {
      const existing = await User.findOne({ username: normalizedUsername, _id: { $ne: userId } });
      if (existing) throw new Error("Tên đăng nhập đã tồn tại");
      user.username = normalizedUsername;
    }
  }

  if (email !== undefined) {
    if (!canEditAccountIdentity) throw new Error("Bạn không có quyền đổi email");

    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail && normalizedEmail !== user.email) {
      const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: userId } });
      if (existing) throw new Error("Email đã tồn tại");
    }
    user.email = normalizedEmail || undefined;
  }

  if (fullName !== undefined) user.fullName = fullName.trim();
  if (phone !== undefined) user.phone = phone.trim();
  if (avatarPosition !== undefined) user.avatarPosition = normalizeImagePosition(avatarPosition);
  if (coverPosition !== undefined) user.coverPosition = normalizeImagePosition(coverPosition);
  if (avatarZoom !== undefined) user.avatarZoom = normalizeImageZoom(avatarZoom);
  if (coverZoom !== undefined) user.coverZoom = normalizeImageZoom(coverZoom);

  await user.save();
  return sanitizeUser(user);
};
const updateUserStatus = async (userId, status) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  user.status = status;

  // Khi khóa tài khoản, revoke refresh token.
  if (status === "inactive") {
    user.refreshTokenHash = null;
  }

  await user.save();

  return sanitizeUser(user);
};

const deleteUser = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  if (user.role === "admin") {
    throw new Error("Admin account cannot be deleted");
  }

  await User.findByIdAndDelete(userId);

  return true;
};
const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  // Kiểm tra mật khẩu hiện tại
  const passwordMatched = await bcrypt.compare(
    currentPassword,
    user.passwordHash,
  );

  if (!passwordMatched) {
    throw new Error("Current password is incorrect");
  }

  // Không cho đổi thành mật khẩu cũ
  const samePassword = await bcrypt.compare(newPassword, user.passwordHash);

  if (samePassword) {
    throw new Error("New password must be different from current password");
  }

  if (newPassword.length < 6) {
    throw new Error("New password must be at least 6 characters");
  }

  // Hash mật khẩu mới
  user.passwordHash = await bcrypt.hash(newPassword, 12);

  // Mật khẩu đổi -> refresh token cũ không còn hợp lệ
  user.refreshTokenHash = null;

  await user.save();

  return sanitizeUser(user);
};
module.exports = {
  getUsers,
  getChatUsers,
  getUserById,
  createUser,
  updateUser,
  updateOwnProfile,
  updateUserStatus,
  deleteUser,
  changePassword,
};
