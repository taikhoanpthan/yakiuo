const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const { getAiMove, getHint } = require("../controllers/caro.controller");
const { getCaroHistory, deleteCaroMatch } = require("../controllers/caroHistory.controller");

const router = express.Router();

router.use(authenticate);
router.use((req, res, next) => {
  if (!["admin", "employee", "premium"].includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: "Chỉ Admin, Employee hoặc Premium được chơi cờ caro" });
  }
  next();
});
router.post("/ai-move", getAiMove);
router.post("/hint", getHint);
router.get("/history", getCaroHistory);
router.delete("/history/:id", deleteCaroMatch);

module.exports = router;
