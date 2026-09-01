const jwt = require("jsonwebtoken");
const User = require("../models/User");
const SystemSetting = require("../models/SystemSetting");

const authenticate = async (
  req,
  res,
  next
) => {
  try {
    const authHeader =
      req.headers.authorization;

    if (
      !authHeader?.startsWith(
        "Bearer "
      )
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    const token =
      authHeader.split(" ")[1];

    const decoded =
      jwt.verify(
        token,
        process.env.JWT_ACCESS_SECRET
      );

    const user =
      await User.findById(
        decoded.userId
      ).select("-passwordHash");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    if (
      user.status !== "active"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Account is inactive",
      });
    }

    req.user = user;

    if (user.role !== "admin") {
      const settings = await SystemSetting.findOne({ key: "system" }).select("maintenanceMode").lean();
      if (settings?.maintenanceMode) return res.status(503).json({ success: false, code: "MAINTENANCE", message: "Hệ thống đang bảo trì" });
    }

    next();
  } catch (error) {
    console.error(
      "Auth middleware error:",
      error.message
    );

    if (
      error.name ===
        "JsonWebTokenError" ||
      error.name ===
        "TokenExpiredError"
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid or expired token",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Authentication failed",
    });
  }
};

module.exports = {
  authenticate,
};
