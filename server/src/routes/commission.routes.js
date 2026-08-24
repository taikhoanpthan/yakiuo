const express = require("express");

const router = express.Router();

const {
  createCommission,
  getMyCommissions,
  getCommissionById,
  updateCommission,
  deleteCommission,
  getCommissionsByUser,
} = require("../controllers/commission.controller");

const {
  authenticate,
} = require("../middleware/auth.middleware");

// =========================
// MY COMMISSIONS
// =========================

router.get(
  "/my",
  authenticate,
  getMyCommissions
);

// =========================
// COMMISSION OF USER
// =========================

router.get(
  "/user/:userId",
  authenticate,
  getCommissionsByUser
);

// =========================
// CREATE
// =========================

router.post(
  "/",
  authenticate,
  createCommission
);

// =========================
// GET ONE
// =========================

router.get(
  "/:id",
  authenticate,
  getCommissionById
);

// =========================
// UPDATE
// =========================

router.put(
  "/:id",
  authenticate,
  updateCommission
);

// =========================
// DELETE
// =========================

router.delete(
  "/:id",
  authenticate,
  deleteCommission
);

module.exports = router;