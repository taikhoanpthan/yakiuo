import api from "./api";

export const getMyTrash = () => api.get("/trash/my");
export const restoreTrashItem = (type, id) => api.post(`/trash/${type}/${id}/restore`);
export const clearTrash = (type) => api.delete(`/trash/${type}/all`);
