const express = require("express");

const {
  getWorkSchedule,
  updateWorkSchedule,
} = require("../controllers/workSchedule.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { requirePermission } = require("../middleware/permission.middleware");

const router = express.Router();

router.get("/", authenticate, getWorkSchedule);

router.put("/", authenticate, requirePermission("workSchedule.update"), updateWorkSchedule);

module.exports = router;
