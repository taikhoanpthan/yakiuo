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