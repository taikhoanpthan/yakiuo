const ChessMatch = require("../models/ChessMatch");

const rooms = new Map();
const files = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const board = () => [["bR","bN","bB","bQ","bK","bB","bN","bR"],Array(8).fill("bP"),...Array.from({ length: 4 }, () => Array(8).fill("")),Array(8).fill("wP"),["wR","wN","wB","wQ","wK","wB","wN","wR"]];
const code = () => Array.from({ length: 5 }, () => files[Math.floor(Math.random() * files.length)]).join("");
const inside = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
const same = (piece, color) => piece && piece[0] === color;
const targets = (state, row, col) => {
  const piece = state[row]?.[col]; if (!piece) return [];
  const color = piece[0], kind = piece[1], result = [], add = (r, c) => { if (inside(r, c) && !same(state[r][c], color)) result.push({ row: r, col: c }); };
  if (kind === "P") { const step = color === "w" ? -1 : 1, start = color === "w" ? 6 : 1; if (inside(row + step, col) && !state[row + step][col]) { result.push({ row: row + step, col }); if (row === start && !state[row + step * 2][col]) result.push({ row: row + step * 2, col }); } [-1, 1].forEach((dc) => { if (inside(row + step, col + dc) && state[row + step][col + dc] && !same(state[row + step][col + dc], color)) result.push({ row: row + step, col: col + dc }); }); }
  else if (kind === "N" || kind === "K") (kind === "N" ? [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]] : [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]).forEach(([dr, dc]) => add(row + dr, col + dc));
  else { const dirs = kind === "R" ? [[-1,0],[1,0],[0,-1],[0,1]] : kind === "B" ? [[-1,-1],[-1,1],[1,-1],[1,1]] : [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]; dirs.forEach(([dr, dc]) => { let r = row + dr, c = col + dc; while (inside(r, c)) { if (same(state[r][c], color)) break; result.push({ row: r, col: c }); if (state[r][c]) break; r += dr; c += dc; } }); }
  return result;
};
const apply = (state, from, to) => state.map((line, r) => line.map((piece, c) => r === to.row && c === to.col ? (state[from.row][from.col][1] === "P" && [0, 7].includes(to.row) ? `${state[from.row][from.col][0]}Q` : state[from.row][from.col]) : r === from.row && c === from.col ? "" : piece));
const snapshot = (room, userId) => ({ code: room.code, board: room.board, turn: room.turn, winner: room.winner, lastMove: room.lastMove, players: room.players, playerInfo: room.playerInfo, yourColor: room.players.w === userId ? "w" : room.players.b === userId ? "b" : null });

module.exports = (io) => io.on("connection", (socket) => {
  const userId = String(socket.data.authUserId || "");
  const allowed = ["admin", "employee", "premium"].includes(socket.data.authUserRole);
  const profile = socket.data.authUserProfile;
  const emit = (room) => Object.values(room.players).filter(Boolean).forEach((id) => io.to(`user:${id}`).emit("chess:state", snapshot(room, id)));
  const save = async (room) => { if (!room.winner || room.saved || room.winner === "draw") return; room.saved = true; try { await ChessMatch.create({ playerWhite: room.players.w, playerBlack: room.players.b, winner: room.winner, moveCount: room.moves.length, moves: room.moves }); } catch (error) { room.saved = false; console.error("Save chess match failed:", error); } };
  socket.on("chess:create", (_data, callback) => { if (typeof _data === "function") callback = _data; callback ||= () => {}; if (!allowed) return callback({ success: false, message: "Bạn không có quyền chơi cờ vua" }); let roomCode = code(); while (rooms.has(roomCode)) roomCode = code(); const room = { code: roomCode, board: board(), turn: "w", winner: null, lastMove: null, players: { w: userId, b: null }, playerInfo: { w: profile, b: null }, moves: [], saved: false }; rooms.set(roomCode, room); socket.join(`chess:${roomCode}`); callback({ success: true, room: snapshot(room, userId) }); });
  socket.on("chess:join", ({ code: input } = {}, callback = () => {}) => { if (!allowed) return callback({ success: false, message: "Bạn không có quyền chơi cờ vua" }); const room = rooms.get(String(input || "").toUpperCase()); if (!room) return callback({ success: false, message: "Không tìm thấy phòng" }); if (!room.players.b && room.players.w !== userId) { room.players.b = userId; room.playerInfo.b = profile; } if (!Object.values(room.players).includes(userId)) return callback({ success: false, message: "Phòng đã đủ người" }); socket.join(`chess:${room.code}`); emit(room); callback({ success: true, room: snapshot(room, userId) }); });
  socket.on("chess:move", async ({ code: input, from, to } = {}) => { const room = rooms.get(String(input || "").toUpperCase()); if (!allowed || !room || room.winner || !room.players.b || !from || !to) return; const color = room.players.w === userId ? "w" : room.players.b === userId ? "b" : null; if (!color || room.turn !== color || !targets(room.board, from.row, from.col).some((move) => move.row === to.row && move.col === to.col)) return; const piece = room.board[from.row][from.col], captured = room.board[to.row][to.col]; room.board = apply(room.board, from, to); room.lastMove = { from, to }; room.moves.push({ from, to, piece }); if (captured?.[1] === "K") room.winner = color; else room.turn = color === "w" ? "b" : "w"; if (room.winner) await save(room); emit(room); });
  socket.on("chess:restart", ({ code: input } = {}) => { const room = rooms.get(String(input || "").toUpperCase()); if (!room || !Object.values(room.players).includes(userId)) return; room.board = board(); room.turn = "w"; room.winner = null; room.lastMove = null; room.moves = []; room.saved = false; emit(room); });
  socket.on("disconnect", () => { for (const room of rooms.values()) if (Object.values(room.players).includes(userId)) { rooms.delete(room.code); Object.values(room.players).filter((id) => id && id !== userId).forEach((id) => io.to(`user:${id}`).emit("chess:closed", { message: "Đối thủ đã rời phòng" })); } });
});
