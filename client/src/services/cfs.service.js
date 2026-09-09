import api from "./api";

export const uploadCfsImage = (file) => { const formData = new FormData(); formData.append("image", file); return api.post("/upload/chat-image", formData); };

export const getCfsPosts = (params) => api.get("/cfs", { params });
export const getCfsPost = (id) => api.get(`/cfs/${id}`);
export const getCfsStories = () => api.get("/cfs/stories");
export const getAudiusTracks = (q) => api.get("/cfs/audius/tracks", { params: { q } });
export const resolveCfsMusicLink = (url) => api.post("/cfs/music/resolve", { url });
export const createCfsStory = (data) => api.post("/cfs/stories", data);
export const deleteCfsStory = (id) => api.delete(`/cfs/stories/${id}`);
export const getCfsIdentity = () => api.get("/cfs/identity");
export const setCfsIdentity = (alias) => api.post("/cfs/identity", { alias });
export const createCfsPost = (data) => api.post("/cfs", data);
export const updateCfsPost = (id, data) => api.put(`/cfs/${id}`, data);
export const toggleCfsLike = (id) => api.post(`/cfs/${id}/like`);
export const toggleCfsPin = (id) => api.post(`/cfs/${id}/pin`);
export const createCfsReply = (id, data) => api.post(`/cfs/${id}/replies`, data);
export const deleteCfsPost = (id) => api.delete(`/cfs/${id}`);
export const deleteCfsReply = (postId, replyId) => api.delete(`/cfs/${postId}/replies/${replyId}`);
export const toggleCfsReplyLike = (postId, replyId) => api.post(`/cfs/${postId}/replies/${replyId}/like`);
export const getCfsActivity = () => api.get("/cfs/activity");
export const markCfsActivityRead = () => api.post("/cfs/activity/read");
export const markCfsActivityItemRead = (id) => api.post(`/cfs/activity/${id}/read`);
export const deleteCfsActivityItem = (id) => api.delete(`/cfs/activity/${id}`);
