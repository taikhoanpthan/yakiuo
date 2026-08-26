const express = require("express");

const router = express.Router();

const {
  createCommission,
  getMyCommissions,
  getCommissionById,
  updateCommission,
  deleteCommission,
  getCommissionsByUser,
  deleteMyCommissionsByMonth,
} = require("../controllers/commission.controller");

const { authenticate } = require("../middleware/auth.middleware");

// =====================================================
// MY COMMISSIONS
// =====================================================

router.get(
  "/my",
  authenticate,
  getMyCommissions,
);

// Xóa toàn bộ commission của user hiện tại trong tháng
router.delete(
  "/my/month",
  authenticate,
  deleteMyCommissionsByMonth,
);

// =====================================================
// COMMISSION OF USER
// =====================================================

router.get(
  "/user/:userId",
  authenticate,
  getCommissionsByUser,
);

// =====================================================
// CREATE
// =====================================================

router.post(
  "/",
  authenticate,
  createCommission,
);

// =====================================================
// GET ONE
// =====================================================

router.get(
  "/:id",
  authenticate,
  getCommissionById,
);

// =====================================================
// UPDATE
// =====================================================

router.put(
  "/:id",
  authenticate,
  updateCommission,
);

// =====================================================
// DELETE ONE
// =====================================================

router.delete(
  "/:id",
  authenticate,
  deleteCommission,
);

module.exports = router;