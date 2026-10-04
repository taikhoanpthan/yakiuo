import api from "./api";

export const getFeedbacks = async (params = {}) => {
  const response = await api.get("/feedback", {
    params,
  });

  return response.data;
};

export const getFeedback = async (id) => {
  const response = await api.get(`/feedback/${id}`);

  return response.data;
};

export const getLateEntryFeedbacks = async (params = {}) => {
  const response = await api.get("/feedback/admin/late-entries", { params });

  return response.data;
};

export const resolveLateEntryFeedback = async (id) => {
  const response = await api.patch(`/feedback/admin/late-entries/${id}/resolve`);

  return response.data;
};

export const resolveAllLateEntryFeedbacks = async () => {
  const response = await api.patch("/feedback/admin/late-entries/resolve-all");

  return response.data;
};

export const createFeedback = async (data) => {
  const response = await api.post("/feedback", data);

  return response.data;
};

export const updateFeedback = async (id, data) => {
  const response = await api.patch(`/feedback/${id}`, data);

  return response.data;
};

export const deleteFeedback = async (id) => {
  const response = await api.delete(`/feedback/${id}`);

  return response.data;
};
