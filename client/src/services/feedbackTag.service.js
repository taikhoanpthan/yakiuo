import api from "./api";

export const getFeedbackTags = async () => (await api.get("/feedback-tags")).data;
export const createFeedbackTag = async (label) => (await api.post("/feedback-tags", { label })).data;
export const deleteFeedbackTag = async (id) => (await api.delete(`/feedback-tags/${id}`)).data;
