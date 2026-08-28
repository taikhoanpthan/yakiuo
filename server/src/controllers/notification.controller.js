const notificationService = require("../services/notification.service");

// ===============================
// GET ALL NOTIFICATIONS
// ===============================
const getNotifications = async (req, res) => {
  try {
    const notifications =
      await notificationService.getNotifications();

    return res.status(200).json({
      success: true,
      data: {
        notifications,
      },
    });
  } catch (error) {
    console.error(
      "Get notifications failed:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to get notifications",
    });
  }
};

// ===============================
// GET NOTIFICATION BY ID
// ===============================
const getNotificationById = async (
  req,
  res
) => {
  try {
    const notification =
      await notificationService.getNotificationById(
        req.params.id
      );

    return res.status(200).json({
      success: true,
      data: {
        notification,
      },
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// CREATE NOTIFICATION
// ADMIN ONLY
// ===============================
const createNotification = async (
  req,
  res
) => {
  try {
    // Kiểm tra đăng nhập
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    // Admin và manager có thể quản lý thông báo.
    if (!["admin", "manager"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message:
          "Only admin or manager can create notifications",
      });
    }

    const {
      title,
      content,
      type,
    } = req.body;

    // Validate title
    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message:
          "Notification title is required",
      });
    }

    // Validate content
    if (!content?.trim()) {
      return res.status(400).json({
        success: false,
        message:
          "Notification content is required",
      });
    }

    const notification =
      await notificationService.createNotification(
        {
          title,
          content,
          type,
        },
        req.user._id
      );

    return res.status(201).json({
      success: true,
      message:
        "Notification created successfully",
      data: {
        notification,
      },
    });
  } catch (error) {
    console.error(
      "Create notification failed:",
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// UPDATE NOTIFICATION
// ADMIN ONLY
// ===============================
const updateNotification = async (
  req,
  res
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    if (!["admin", "manager"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message:
          "Only admin or manager can update notifications",
      });
    }

    const notification =
      await notificationService.updateNotification(
        req.params.id,
        req.body
      );

    return res.status(200).json({
      success: true,
      message:
        "Notification updated successfully",
      data: {
        notification,
      },
    });
  } catch (error) {
    console.error(
      "Update notification failed:",
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ===============================
// DELETE NOTIFICATION
// ADMIN ONLY
// ===============================
const deleteNotification = async (
  req,
  res
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    if (!["admin", "manager"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message:
          "Only admin or manager can delete notifications",
      });
    }

    await notificationService.deleteNotification(
      req.params.id
    );

    return res.status(200).json({
      success: true,
      message:
        "Notification deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete notification failed:",
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getNotifications,
  getNotificationById,
  createNotification,
  updateNotification,
  deleteNotification,
};
