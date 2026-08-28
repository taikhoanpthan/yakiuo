const express = require("express");

const userController = require("../controllers/user.controller");

const { authenticate } = require("../middleware/auth.middleware");
const { requirePermission } = require("../middleware/permission.middleware");

const router = express.Router();

router.use(authenticate);

// =========================
// CURRENT USER
// =========================

router.get("/me", userController.getMe);
router.patch("/me/profile", userController.updateMyProfile);

// Danh sách hồ sơ rút gọn để chọn người trò chuyện.
router.get("/chat", userController.getChatUsers);

// =========================
// USERS MANAGEMENT
// =========================

router.get("/", requirePermission("users.read"), userController.getUsers);

router.post("/", requirePermission("users.create"), userController.createUser);

router.patch(
  "/:id",
  requirePermission("users.update"),
  userController.updateUser,
);

router.patch(
  "/:id/status",
  requirePermission("users.update"),
  userController.updateUserStatus,
);

router.delete(
  "/:id",
  requirePermission("users.delete"),
  userController.deleteUser,
);

router.get("/:id", requirePermission("users.read"), userController.getUserById);
router.patch("/me/password", authenticate, userController.changePassword);

module.exports = router;
