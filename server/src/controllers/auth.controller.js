const authService = require("../services/auth.service");
const User = require("../models/User");
const {
  getPermissionsByRole,
} = require("../config/permissions");

// =====================================================
// LOGIN
// =====================================================

const login = async (req, res) => {
  try {
    const {
      username,
      password,
    } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Username and password are required",
      });
    }

    const result =
      await authService.login({
        username,
        password,
      });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    console.error(
      "Login failed:",
      error
    );

    return res.status(401).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// REFRESH
// =====================================================

const refresh = async (req, res) => {
  try {
    const { refreshToken } =
      req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message:
          "Refresh token is required",
      });
    }

    const result =
      await authService.refreshAccessToken(
        refreshToken
      );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(
      "Refresh token failed:",
      error
    );

    return res.status(401).json({
      success: false,
      message:
        "Invalid or expired refresh token",
    });
  }
};

// =====================================================
// LOGOUT
// =====================================================

const logout = async (req, res) => {
  try {
    await authService.logout(
      req.user._id
    );

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error(
      "Logout failed:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};

// =====================================================
// ME
// =====================================================

const me = async (req, res) => {
  try {
    const user =
      await User.findById(
        req.user._id
      ).select(
        "-passwordHash -refreshTokenHash"
      );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user,
        permissions:
          getPermissionsByRole(
            user.role
          ),
      },
    });
  } catch (error) {
    console.error(
      "Get current user failed:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to get current user",
    });
  }
};

// =====================================================
// CHANGE PASSWORD
// =====================================================

const changePassword = async (
  req,
  res
) => {
  try {
    const {
      currentPassword,
      newPassword,
    } = req.body;

    await authService.changePassword({
      userId: req.user._id,
      currentPassword,
      newPassword,
    });

    return res.status(200).json({
      success: true,
      message:
        "Password changed successfully",
    });
  } catch (error) {
    console.error(
      "Change password failed:",
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  login,
  refresh,
  logout,
  me,
  changePassword,
};