import api from "./api";

export const getCaroAiMove = (board, difficulty, mark) => api.post("/caro/ai-move", { board, difficulty, mark });
export const getCaroHint = (board, mark) => api.post("/caro/hint", { board, difficulty: "hard", mark });
export const getCaroHistory = (params = {}) => api.get("/caro/history", { params });
export const deleteCaroHistory = (id) => api.delete(`/caro/history/${id}`);
