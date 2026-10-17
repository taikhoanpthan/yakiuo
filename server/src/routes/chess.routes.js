const router = require("express").Router();
const { authenticate } = require("../middleware/auth.middleware");
const { getAiMove } = require("../controllers/chess.controller");
const { getLeaderboard } = require("../controllers/chessHistory.controller");

router.use(authenticate);
router.use((req, res, next) => ["admin", "employee", "premium"].includes(req.user?.role)
  ? next()
  : res.status(403).json({ success: false, message: "Chỉ Admin, Employee hoặc Premium được chơi cờ vua" }));
router.post("/ai-move", getAiMove);
router.get("/leaderboard", getLeaderboard);

module.exports = router;
