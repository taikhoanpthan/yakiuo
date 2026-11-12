const express = require("express");

const router = express.Router();

const {
  createCommission,
  getMyCommissions,
  getCommissionById,
  updateCommission,
  deleteCommission,
  toggleBillCollected,
  getCommissionsByUser,
  deleteMyCommissionsByMonth,
} = require("../controllers/commission.controller");

const { authenticate } = require("../middleware/auth.middleware");
const { requirePermission } = require("../middleware/permission.middleware");

// =====================================================
// MY COMMISSIONS
// =====================================================

router.get(
  "/my",
  authenticate,
  requirePermission("commission.read"),
  getMyCommissions,
);

// Xóa toàn bộ commission của user hiện tại trong tháng
router.delete(
  "/my/month",
  authenticate,
  requirePermission("commission.delete"),
  deleteMyCommissionsByMonth,
);

// =====================================================
// COMMISSION OF USER
// =====================================================

router.get(
  "/user/:userId",
  authenticate,
  requirePermission("commission.read"),
  getCommissionsByUser,
);

// =====================================================
// CREATE
// =====================================================

router.post(
  "/",
  authenticate,
  requirePermission("commission.create"),
  createCommission,
);

// =====================================================
// GET ONE
// =====================================================

router.get(
  "/:id",
  authenticate,
  requirePermission("commission.read"),
  getCommissionById,
);

// =====================================================
// UPDATE
// =====================================================

router.put(
  "/:id",
  authenticate,
  requirePermission("commission.update"),
  updateCommission,
);

router.patch("/:id/bill-collected", authenticate, requirePermission("commission.update"), toggleBillCollected);

// =====================================================
// DELETE ONE
// =====================================================

router.delete(
  "/:id",
  authenticate,
  requirePermission("commission.delete"),
  deleteCommission,
);

module.exports = router;
