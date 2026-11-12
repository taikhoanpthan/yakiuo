const express = require("express");

const {
  getWorkSchedule,
  getWorkSchedules,
  getPreviousWorkSchedule,
  updateWorkSchedule,
  deleteWorkSchedule,
  deleteWorkScheduleById,
  reorderWorkSchedules,
  createDashboardSlide,
} = require("../controllers/workSchedule.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { requirePermission } = require("../middleware/permission.middleware");

const router = express.Router();

router.get("/", authenticate, getWorkSchedule);
router.get("/all", authenticate, getWorkSchedules);
router.get("/previous", authenticate, getPreviousWorkSchedule);

router.put("/", authenticate, requirePermission("workSchedule.update"), updateWorkSchedule);
router.post("/slides", authenticate, requirePermission("workSchedule.update"), createDashboardSlide);
router.put("/order", authenticate, requirePermission("workSchedule.update"), reorderWorkSchedules);
router.delete("/", authenticate, requirePermission("workSchedule.update"), deleteWorkSchedule);
router.delete("/:id", authenticate, requirePermission("workSchedule.update"), deleteWorkScheduleById);

module.exports = router;
