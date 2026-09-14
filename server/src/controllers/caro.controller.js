const { execFile } = require("child_process");
const path = require("path");
const CaroMatch = require("../models/CaroMatch");

const BOARD_SIZE = 15;

const isValidBoard = (board) =>
  Array.isArray(board) &&
  board.length === BOARD_SIZE &&
  board.every((row) =>
    Array.isArray(row) &&
    row.length === BOARD_SIZE &&
    row.every((cell) => ["", "X", "O"].includes(cell)),
  );

const getAiMove = (req, res) => {
  if (!isValidBoard(req.body?.board)) {
    return res.status(400).json({ success: false, message: "Bàn cờ không hợp lệ" });
  }

  const python = process.env.PYTHON_EXECUTABLE || "python";
  const script = path.resolve(__dirname, "../../python/caro_ai.py");
  const child = execFile(python, [script], { timeout: 2000, maxBuffer: 16 * 1024 }, (error, stdout, stderr) => {
    if (error) {
      const pythonMissing = error.code === "ENOENT";
      return res.status(503).json({
        success: false,
        message: pythonMissing
          ? "Máy chủ chưa cài Python để chạy máy chơi cờ"
          : "Máy chơi cờ hiện không phản hồi",
        detail: process.env.NODE_ENV === "production" ? undefined : stderr || error.message,
      });
    }

    try {
      const move = JSON.parse(stdout);
      if (!Number.isInteger(move.row) || !Number.isInteger(move.col)) throw new Error("Nước đi không hợp lệ");
      return res.json({ success: true, data: move });
    } catch (parseError) {
      return res.status(503).json({ success: false, message: "Máy chơi cờ trả về dữ liệu không hợp lệ" });
    }
  });

  const difficulty = ["easy", "medium", "hard"].includes(req.body?.difficulty)
    ? req.body.difficulty
    : "medium";
  const mark = ["X", "O"].includes(req.body?.mark) ? req.body.mark : "O";
  child.stdin.end(JSON.stringify({ board: req.body.board, difficulty, mark }));
};

const getHint = async (req, res) => {
  try {
    const userId = req.user?._id;
    const winCount = await CaroMatch.countDocuments({
      $or: [
        { playerX: userId, winner: "X" },
        { playerO: userId, winner: "O" },
      ],
    });
    if (winCount < 3) {
      return res.status(403).json({ success: false, message: `Cần thắng ít nhất 3 trận online để dùng gợi ý (${winCount}/3)` });
    }
    return getAiMove(req, res);
  } catch (error) {
    console.error("Get caro hint failed:", error);
    return res.status(500).json({ success: false, message: "Không thể kiểm tra quyền dùng gợi ý" });
  }
};

module.exports = { getAiMove, getHint };
