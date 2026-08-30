import api from "./api";

export const getCfsPosts = () => api.get("/cfs");
export const getCfsIdentity = () => api.get("/cfs/identity");
export const setCfsIdentity = (alias) => api.post("/cfs/identity", { alias });
export const createCfsPost = (data) => api.post("/cfs", data);
export const toggleCfsLike = (id) => api.post(`/cfs/${id}/like`);
export const createCfsReply = (id, data) => api.post(`/cfs/${id}/replies`, data);
export const deleteCfsPost = (id) => api.delete(`/cfs/${id}`);
export const deleteCfsReply = (postId, replyId) => api.delete(`/cfs/${postId}/replies/${replyId}`);
export const toggleCfsReplyLike = (postId, replyId) => api.post(`/cfs/${postId}/replies/${replyId}/like`);
