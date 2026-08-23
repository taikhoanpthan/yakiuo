const {
  hasPermission,
} = require("../config/permissions");

const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const allowed = hasPermission(
      req.user.role,
      permission
    );

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to access this resource",
      });
    }

    next();
  };
};

module.exports = {
  requirePermission,
};