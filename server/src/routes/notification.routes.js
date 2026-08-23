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
  createNotification
);

router.put(
  "/:id",
  authenticate,
  updateNotification
);

router.delete(
  "/:id",
  authenticate,
  deleteNotification
);

module.exports = router;