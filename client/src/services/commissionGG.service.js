import api from "./api";

export const getMyCommissionGGImages = async (month) => {
  const response = await api.get("/commission-gg/my", { params: { month } });
  return response.data;
};

export const getUserCommissionGGImages = async (userId, month) => {
  const response = await api.get(`/commission-gg/user/${userId}`, { params: { month } });
  return response.data;
};

export const uploadCommissionGGImages = async (month, files) => {
  const formData = new FormData();
  formData.append("month", month);
  files.forEach((file) => formData.append("images", file));

  const response = await api.post("/commission-gg/my", formData);
  return response.data;
};

export const deleteMyCommissionGGImagesByMonth = async (month) => {
  const response = await api.delete("/commission-gg/my/month", { params: { month } });
  return response.data;
};
