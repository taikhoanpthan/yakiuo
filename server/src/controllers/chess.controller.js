const { execFile } = require("child_process");
const path = require("path");

const PIECES = new Set(["", "wK", "wQ", "wR", "wB", "wN", "wP", "bK", "bQ", "bR", "bB", "bN", "bP"]);

const isValidBoard = (board) => Array.isArray(board) && board.length === 8 && board.every((row) => Array.isArray(row) && row.length === 8 && row.every((piece) => PIECES.has(piece)));

exports.getAiMove = (req, res) => {
  if (!isValidBoard(req.body?.board) || !["w", "b"].includes(req.body?.turn)) {
    return res.status(400).json({ success: false, message: "Bàn cờ vua không hợp lệ" });
  }

  const python = process.env.PYTHON_EXECUTABLE || "python";
  const script = path.resolve(__dirname, "../../python/chess_ai.py");
  const child = execFile(python, [script], { timeout: 2500, maxBuffer: 16 * 1024 }, (error, stdout, stderr) => {
    if (error) {
      return res.status(503).json({
        success: false,
        message: error.code === "ENOENT" ? "Máy chủ chưa cài Python để chạy máy chơi cờ" : "Máy chơi cờ vua hiện không phản hồi",
        detail: process.env.NODE_ENV === "production" ? undefined : stderr || error.message,
      });
    }
    try {
      const move = JSON.parse(stdout);
      if (![move?.from?.row, move?.from?.col, move?.to?.row, move?.to?.col].every(Number.isInteger)) throw new Error("Nước đi không hợp lệ");
      return res.json({ success: true, data: move });
    } catch {
      return res.status(503).json({ success: false, message: "Máy chơi cờ vua trả về dữ liệu không hợp lệ" });
    }
  });
  child.stdin.end(JSON.stringify({ board: req.body.board, turn: req.body.turn, difficulty: req.body.difficulty }));
};
