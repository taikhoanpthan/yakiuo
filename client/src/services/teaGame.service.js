import api from "./api";

export const submitTeaGameResult = (data) => api.post("/tea-game/results", data);
export const getTeaGameLeaderboard = () => api.get("/tea-game/leaderboard");
