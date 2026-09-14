const express = require("express");

const {
  getWorkSchedule,
  getPreviousWorkSchedule,
  updateWorkSchedule,
  deleteWorkSchedule,
} = require("../controllers/workSchedule.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { requirePermission } = require("../middleware/permission.middleware");

const router = express.Router();

router.get("/", authenticate, getWorkSchedule);
router.get("/previous", authenticate, getPreviousWorkSchedule);

router.put("/", authenticate, requirePermission("workSchedule.update"), updateWorkSchedule);
router.delete("/", authenticate, requirePermission("workSchedule.update"), deleteWorkSchedule);

module.exports = router;
