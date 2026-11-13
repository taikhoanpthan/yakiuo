const express = require("express");

const {
  getNotifications,
  getNotificationById,
  createNotification,
  updateNotification,
  deleteNotification,
} = require("../controllers/notification.controller");

const {
  authenticate,
} = require("../middleware/auth.middleware");
const { requirePermission } = require("../middleware/permission.middleware");

const router = express.Router();

// User + Admin
router.get(
  "/",
  authenticate,
  getNotifications
);

router.get(
  "/:id",
  authenticate,
  getNotificationById
);

// Admin only
router.post(
  "/",
  authenticate,
  requirePermission("notifications.create"),
  createNotification
);

router.put(
  "/:id",
  authenticate,
  requirePermission("notifications.update"),
  updateNotification
);

router.delete(
  "/:id",
  authenticate,
  requirePermission("notifications.delete"),
  deleteNotification
);

module.exports = router;
