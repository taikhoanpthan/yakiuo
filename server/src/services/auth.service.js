const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// =========================
// HELPERS
// =========================

const sanitizeUser = (user) => {
  const data = user.toObject ? user.toObject() : { ...user };

  delete data.passwordHash;
  delete data.refreshTokenHash;
  delete data.__v;

  return data;
};

const hashToken = (token) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};

// =========================
// LOGIN
// =========================

const login = async ({ username, password }) => {
  const user = await User.findOne({
    username: username.trim(),
  });

  if (!user) {
    throw new Error("Invalid username or password");
  }

  if (user.status !== "active") {
    throw new Error("Account is inactive");
  }

  const passwordMatched = await bcrypt.compare(
    password,
    user.passwordHash,
  );

  if (!passwordMatched) {
    throw new Error("Invalid username or password");
  }

  if (!process.env.JWT_ACCESS_SECRET) {
    throw new Error("JWT_ACCESS_SECRET is not configured");
  }

  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error("JWT_REFRESH_SECRET is not configured");
  }

  const accessToken = jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
    },
    process.env.JWT_ACCESS_SECRET,
    {
      expiresIn: "15m",
    },
  );

  const refreshToken = jwt.sign(
    {
      userId: user._id.toString(),
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: "7d",
    },
  );

  user.refreshTokenHash = hashToken(refreshToken);

  await user.save();

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  };
};

// =========================
// REFRESH ACCESS TOKEN
// =========================

const refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    throw new Error("Refresh token is required");
  }

  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error("JWT_REFRESH_SECRET is not configured");
  }

  let decoded;

  try {
    decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET,
    );
  } catch (error) {
    throw new Error("Invalid or expired refresh token");
  }

  const user = await User.findById(decoded.userId);

  if (!user) {
    throw new Error("User not found");
  }

  if (user.status !== "active") {
    throw new Error("Account is inactive");
  }

  const refreshTokenHash = hashToken(refreshToken);

  if (user.refreshTokenHash !== refreshTokenHash) {
    throw new Error("Invalid refresh token");
  }

  const accessToken = jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
    },
    process.env.JWT_ACCESS_SECRET,
    {
      expiresIn: "15m",
    },
  );

  return {
    accessToken,
  };
};
// =========================
// CHANGE PASSWORD
// =========================

const changePassword = async ({
  userId,
  currentPassword,
  newPassword,
}) => {
  if (!currentPassword || !newPassword) {
    throw new Error("Current password and new password are required");
  }

  if (newPassword.length < 6) {
    throw new Error("New password must be at least 6 characters");
  }

  if (currentPassword === newPassword) {
    throw new Error("New password must be different from current password");
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  if (user.status !== "active") {
    throw new Error("Account is inactive");
  }

  // Kiểm tra mật khẩu hiện tại
  const currentPasswordMatched = await bcrypt.compare(
    currentPassword,
    user.passwordHash,
  );

  if (!currentPasswordMatched) {
    throw new Error("Current password is incorrect");
  }

  // Hash mật khẩu mới
  const newPasswordHash = await bcrypt.hash(
    newPassword,
    12,
  );

  // Lưu hash mới
  user.passwordHash = newPasswordHash;

  // Đăng xuất toàn bộ session cũ
  user.refreshTokenHash = null;

  await user.save();

  return {
    message: "Password changed successfully",
  };
};
// =========================
// LOGOUT
// =========================

const logout = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    return;
  }

  user.refreshTokenHash = null;

  await user.save();
};

// =========================
// EXPORT
// =========================

module.exports = {
  login,
  refreshAccessToken,
  logout,
  changePassword,
};