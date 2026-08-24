import api from "./api";

export const createCommission = async (data) => {
  const response = await api.post("/commissions", data);

  return response.data;
};

export const getMyCommissions = async () => {
  const response = await api.get("/commissions/my");

  return response.data;
};

export const getCommissionById = async (id) => {
  const response = await api.get(`/commissions/${id}`);

  return response.data;
};

export const updateCommission = async (id, data) => {
  const response = await api.put(`/commissions/${id}`, data);

  return response.data;
};

export const deleteCommission = async (id) => {
  const response = await api.delete(`/commissions/${id}`);

  return response.data;
};
export const getUserCommissions = async (userId, month, year) => {
  const response = await api.get(`/commissions/user/${userId}`, {
    params: {
      month,
      year,
    },
  });

  return response.data;
};
