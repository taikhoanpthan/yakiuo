import api from "./api";

export const getUsers = async (params = {}) => {
  const response = await api.get("/users", {
    params,
  });

  return response.data;
};

export const createUser = async (data) => {
  const response = await api.post("/users", data);

  return response.data;
};

export const updateUser = async (id, data) => {
  const response = await api.patch(`/users/${id}`, data);

  return response.data;
};

export const updateUserStatus = async (id, status) => {
  const response = await api.patch(`/users/${id}/status`, {
    status,
  });

  return response.data;
};

export const deleteUser = async (id) => {
  const response = await api.delete(`/users/${id}`);

  return response.data;
};
export const getMe = async () => {
  const response = await api.get("/users/me");

  return response.data;
};
export const changePassword = async (data) => {
  const response = await api.patch("/users/me/password", data);

  return response.data;
};
export const updateMyProfile = async (data) => {
  const response = await api.patch("/users/me/profile", data);

  return response.data;
};
