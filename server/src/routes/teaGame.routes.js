const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const { submitTeaGameResult, getTeaGameLeaderboard } = require("../controllers/teaGame.controller");
const SystemSetting = require("../models/SystemSetting");

const router = express.Router();

router.use(authenticate);
router.use(async (_req, res, next) => {
  try {
    const settings = await SystemSetting.findOne({ key: "system" }).select("features.teaGame").lean();
    if (settings?.features?.teaGame === false) {
      return res.status(403).json({ success: false, code: "FEATURE_DISABLED", message: "Game Quầy Pha Chế hiện đang tạm tắt" });
    }
    return next();
  } catch (error) {
    return next(error);
  }
});
router.get("/leaderboard", getTeaGameLeaderboard);
router.post("/results", submitTeaGameResult);

module.exports = router;
