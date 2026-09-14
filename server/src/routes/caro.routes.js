const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const { getAiMove } = require("../controllers/caro.controller");

const router = express.Router();

router.use(authenticate);
router.use((req, res, next) => {
  if (!["admin", "employee", "premium"].includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: "Chỉ Admin, Employee hoặc Premium được chơi cờ caro" });
  }
  next();
});
router.post("/ai-move", getAiMove);

module.exports = router;
