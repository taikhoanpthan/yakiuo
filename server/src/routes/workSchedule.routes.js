const express = require("express");

const {
  getWorkSchedule,
  updateWorkSchedule,
} = require("../controllers/workSchedule.controller");

const router = express.Router();

router.get("/", getWorkSchedule);

router.put("/", updateWorkSchedule);

module.exports = router;