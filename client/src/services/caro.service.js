import api from "./api";

export const getCaroAiMove = (board, difficulty) => api.post("/caro/ai-move", { board, difficulty });
