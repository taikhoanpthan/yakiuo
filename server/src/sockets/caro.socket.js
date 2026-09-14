const BOARD_SIZE = 15;
const TURN_TIMEOUT_MS = 60 * 1000;
const rooms = new Map();
const CaroMatch = require("../models/CaroMatch");

const emptyBoard = () => Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(""));
const roomCode = () => Math.random().toString(36).slice(2, 7).toUpperCase();

const hasWin = (board, row, col, mark) => {
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
  return directions.some(([dr, dc]) => {
    let count = 1;
    for (const direction of [1, -1]) {
      let r = row + dr * direction;
      let c = col + dc * direction;
      while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === mark) {
        count += 1;
        r += dr * direction;
        c += dc * direction;
      }
    }
    return count >= 5;
  });
};

const publicRoom = (room, userId) => ({
  code: room.code,
  board: room.board,
  turn: room.turn,
  winner: room.winner,
  timeoutWinner: room.timeoutWinner || null,
  lastMove: room.lastMove,
  turnStartedAt: room.turnStartedAt,
  players: room.players,
  playerInfo: room.playerInfo,
  yourMark: room.players.X === userId ? "X" : room.players.O === userId ? "O" : null,
});

module.exports = (io) => {
  const clearTurnTimer = (room) => {
    if (room.turnTimer) clearTimeout(room.turnTimer);
    room.turnTimer = null;
  };

  const saveCompletedGame = async (room) => {
    if (!room.winner || room.saved) return;
    room.saved = true;
    try {
      await CaroMatch.create({ playerX: room.players.X, playerO: room.players.O, winner: room.winner, moveCount: room.moveCount, moves: room.moves, endReason: room.timeoutWinner ? "timeout" : room.winner === "draw" ? "draw" : "win" });
    } catch (error) {
      room.saved = false;
      console.error("Save caro match failed:", error);
    }
  };

  const scheduleTurnTimeout = (room, emitRoom) => {
    clearTurnTimer(room);
    if (!room.players.O || room.winner) return;
    room.turnStartedAt = Date.now();
    room.turnTimer = setTimeout(async () => {
      if (!rooms.has(room.code) || room.winner) return;
      room.winner = room.turn === "X" ? "O" : "X";
      room.timeoutWinner = room.winner;
      await saveCompletedGame(room);
      emitRoom(room);
    }, TURN_TIMEOUT_MS);
  };

  io.on("connection", (socket) => {
    const userId = String(socket.data.authUserId || "");
    const canPlay = ["admin", "employee", "premium"].includes(socket.data.authUserRole);
    const userProfile = socket.data.authUserProfile;

    const emitRoom = (room) => {
      Object.values(room.players).filter(Boolean).forEach((playerId) => {
        io.to(`user:${playerId}`).emit("caro:state", publicRoom(room, playerId));
      });
    };

    socket.on("caro:create", (_data, callback) => {
      if (typeof _data === "function") callback = _data;
      if (typeof callback !== "function") callback = () => {};
      if (!canPlay) return callback({ success: false, message: "Chỉ Admin, Employee hoặc Premium được chơi cờ caro" });
      let code = roomCode();
      while (rooms.has(code)) code = roomCode();
      const room = { code, board: emptyBoard(), players: { X: userId, O: null }, playerInfo: { X: userProfile, O: null }, turn: "X", winner: null, lastMove: null, moveCount: 0, moves: [], saved: false, turnStartedAt: null, turnTimer: null };
      rooms.set(code, room);
      socket.join(`caro:${code}`);
      callback({ success: true, room: publicRoom(room, userId) });
    });

    socket.on("caro:join", ({ code } = {}, callback = () => {}) => {
      if (!canPlay) return callback({ success: false, message: "Chỉ Admin, Employee hoặc Premium được chơi cờ caro" });
      const room = rooms.get(String(code || "").toUpperCase());
      if (!room) return callback({ success: false, message: "Không tìm thấy phòng" });
      if (!room.players.O && room.players.X !== userId) {
        room.players.O = userId;
        room.playerInfo.O = userProfile;
        scheduleTurnTimeout(room, emitRoom);
      }
      if (room.players.X !== userId && room.players.O !== userId) return callback({ success: false, message: "Phòng đã đủ người" });
      socket.join(`caro:${room.code}`);
      emitRoom(room);
      callback({ success: true, room: publicRoom(room, userId) });
    });

    socket.on("caro:move", async ({ code, row, col } = {}) => {
      if (!canPlay) return;
      const room = rooms.get(String(code || "").toUpperCase());
      if (!room || room.winner || !Number.isInteger(row) || !Number.isInteger(col) || row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return;
      const mark = room.players.X === userId ? "X" : room.players.O === userId ? "O" : null;
      if (!mark || room.turn !== mark || room.board[row][col]) return;
      room.board[row][col] = mark;
      room.moveCount += 1;
      room.lastMove = { row, col, mark };
      room.moves.push({ row, col, mark });
      if (hasWin(room.board, row, col, mark)) room.winner = mark;
      else if (room.board.every((line) => line.every(Boolean))) room.winner = "draw";
      else room.turn = mark === "X" ? "O" : "X";
      if (room.winner) { clearTurnTimer(room); await saveCompletedGame(room); }
      else scheduleTurnTimeout(room, emitRoom);
      emitRoom(room);
    });

    socket.on("caro:restart", ({ code } = {}) => {
      if (!canPlay) return;
      const room = rooms.get(String(code || "").toUpperCase());
      if (!room || !Object.values(room.players).includes(userId)) return;
      const nextStarter = room.winner === "X" ? "O" : room.winner === "O" ? "X" : "X";
      room.board = emptyBoard(); room.turn = nextStarter; room.winner = null; room.lastMove = null; room.moveCount = 0; room.moves = []; room.saved = false; room.timeoutWinner = null;
      scheduleTurnTimeout(room, emitRoom);
      emitRoom(room);
    });

    socket.on("disconnect", () => {
      for (const room of rooms.values()) {
        if (!Object.values(room.players).includes(userId)) continue;
        clearTurnTimer(room);
        rooms.delete(room.code);
        Object.values(room.players).filter((player) => player && player !== userId).forEach((player) => io.to(`user:${player}`).emit("caro:closed", { code: room.code, message: "Đối thủ đã rời phòng" }));
      }
    });
  });
};
