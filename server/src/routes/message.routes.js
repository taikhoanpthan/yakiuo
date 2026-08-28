const express = require("express");

const {
  getMessages,
  markMessagesAsRead,
  deleteMessage,
} = require("../controllers/message.controller");

const {
  authenticate,
} = require("../middleware/auth.middleware");

const router = express.Router();

// =========================
// GET MESSAGE HISTORY
// =========================

router.post(
  "/:conversationId/read",
  authenticate,
  markMessagesAsRead,
);

router.delete("/:messageId", authenticate, deleteMessage);

router.get("/:conversationId", authenticate, getMessages);

module.exports = router;
