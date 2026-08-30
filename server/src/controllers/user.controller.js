const userService = require("../services/user.service");
const { getActivities, recordActivity, deleteActivity, deleteAllActivities } = require("../services/userActivity.service");

const forceLogoutUserSockets = (io, userId) => {
  if (!io || !userId) return;

  const targetUserId = String(userId);

  for (const socket of io.sockets.sockets.values()) {
    if (String(socket.data?.authUserId) !== targetUserId) continue;

    socket.emit("account:locked", {
      message: "Tài khoản của bạn đã bị khóa bởi quản trị viên.",
    });
    socket.disconnect(true);
  }
};

const getUsers = async (req, res) => {
  try {
    const result = await userService.getUsers(req.query);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get users failed:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get users",
    });
  }
};

// Danh sách rút gọn để mọi người dùng đã đăng nhập có thể mở chat.
const getChatUsers = async (req, res) => {
  try {
    const users = await userService.getChatUsers();

    return res.status(200).json({
      success: true,
      data: { users },
    });
  } catch (error) {
    console.error("Get chat users failed:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể tải danh sách người dùng cho chat",
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await userService.getUserById(req.params.id);

    return res.status(200).json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

const createUser = async (req, res) => {
  try {
    const { username, email, password, fullName, avatar, phone, role, status } =
      req.body;

    if (!username || !password || !fullName) {
      return res.status(400).json({
        success: false,
        message: "Username, password and fullName are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    if (role && !["employee", "premium", "manager", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    if (status && !["active", "inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const user = await userService.createUser({
      username,
      email,
      password,
      fullName,
      avatar,
      phone,
      role,
      status,
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        user,
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const updateUser = async (req, res) => {
  try {
    if (req.user.role === "manager") {
      const targetUser = await userService.getUserById(req.params.id);

      if (targetUser.role !== "employee") {
        return res.status(403).json({
          success: false,
          message: "Manager chỉ có thể quản lý tài khoản nhân viên",
        });
      }

      const restrictedFields = ["username", "email", "role", "password"];
      if (restrictedFields.some((field) => req.body[field] !== undefined)) {
        return res.status(403).json({
          success: false,
          message: "Manager chỉ được cập nhật họ tên, số điện thoại và ảnh đại diện",
        });
      }
    }

    if (req.body.role) {
      if (!["employee", "premium", "manager", "admin"].includes(req.body.role)) {
        return res.status(400).json({
          success: false,
          message: "Invalid role",
        });
      }
    }

    const user = await userService.updateUser(req.params.id, req.body);

    if (req.body.password?.trim()) {
      await recordActivity({ user: user._id, type: "password_changed", ipAddress: req.ip, userAgent: req.get("user-agent") || "" });
    }

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: {
        user,
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be active or inactive",
      });
    }

    if (req.user.role === "manager") {
      const targetUser = await userService.getUserById(req.params.id);

      if (targetUser.role !== "employee") {
        return res.status(403).json({
          success: false,
          message: "Manager chỉ có thể thay đổi trạng thái tài khoản nhân viên",
        });
      }
    }

    const user = await userService.updateUserStatus(req.params.id, status);

    if (status === "inactive") {
      forceLogoutUserSockets(req.app.get("io"), user._id);
    }

    return res.status(200).json({
      success: true,
      message: "User status updated successfully",
      data: {
        user,
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    await userService.deleteUser(req.params.id);

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
const getMe = async (req, res) => {
  try {
    const user = await userService.getUserById(req.user._id);

    return res.status(200).json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

const updateMyProfile = async (req, res) => {
  try {
    const user = await userService.updateOwnProfile(req.user._id, req.body);

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: { user },
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const {
      currentPassword,
      newPassword,
    } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message:
          "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message:
          "New password must be at least 6 characters",
      });
    }

    await userService.changePassword(
      req.user._id,
      currentPassword,
      newPassword
    );
    await recordActivity({ user: req.user._id, type: "password_changed", ipAddress: req.ip, userAgent: req.get("user-agent") || "" });

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password failed:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
const getUserActivities = async (req, res) => {
  try {
    const result = await getActivities(req.query);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Get user activities failed:", error);
    return res.status(500).json({ success: false, message: "Không thể tải lịch sử hoạt động" });
  }
};
const removeUserActivity = async (req, res) => {
  try {
    await deleteActivity(req.params.activityId);
    return res.status(200).json({ success: true, message: "Đã xóa lịch sử hoạt động" });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
};
const removeAllUserActivities = async (_req, res) => {
  try {
    const deletedCount = await deleteAllActivities();
    return res.status(200).json({ success: true, message: "Đã xóa toàn bộ lịch sử hoạt động", data: { deletedCount } });
  } catch (error) {
    console.error("Delete all user activities failed:", error);
    return res.status(500).json({ success: false, message: "Không thể xóa toàn bộ lịch sử" });
  }
};
module.exports = {
  getMe,
  updateMyProfile,
  getUsers,
  getChatUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserStatus,
  deleteUser,
  changePassword,
  getUserActivities,
  removeUserActivity,
  removeAllUserActivities,
};
