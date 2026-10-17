import api from "./api";

export const getChessAiMove = (board, turn, difficulty) => api.post("/chess/ai-move", { board, turn, difficulty });
export const getChessLeaderboard = () => api.get("/chess/leaderboard");
