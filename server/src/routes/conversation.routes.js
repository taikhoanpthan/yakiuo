const express = require("express");

const {
  createConversation,
  getMyConversations,
  getConversationById,
  deleteConversation,
} = require("../controllers/conversation.controller");

const {
  authenticate,
} = require("../middleware/auth.middleware");

const router = express.Router();

// =========================
// CREATE / GET 1-1 CONVERSATION
// =========================

router.post(
  "/",
  authenticate,
  createConversation
);

// =========================
// GET MY CONVERSATIONS
// =========================

router.get(
  "/",
  authenticate,
  getMyConversations
);

// =========================
// GET ONE CONVERSATION
// =========================

router.get(
  "/:id",
  authenticate,
  getConversationById
);

router.delete("/:id", authenticate, deleteConversation);

module.exports = router;
