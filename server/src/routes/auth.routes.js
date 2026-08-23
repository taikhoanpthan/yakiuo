const express = require("express");

const authController = require("../controllers/auth.controller");

const {
  authenticate,
} = require("../middleware/auth.middleware");

const router = express.Router();

// =========================
// LOGIN
// =========================

router.post(
  "/login",
  authController.login,
);

// =========================
// REFRESH
// =========================

router.post(
  "/refresh",
  authController.refresh,
);

// =========================
// CURRENT USER
// =========================

router.get(
  "/me",
  authenticate,
  authController.me,
);

// =========================
// LOGOUT
// =========================

router.post(
  "/logout",
  authenticate,
  authController.logout,
);

// =========================
// CHANGE PASSWORD
// =========================

router.patch(
  "/change-password",
  authenticate,
  authController.changePassword,
);

module.exports = router;