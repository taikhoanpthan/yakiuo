import api from "./api";

export const getInventory = async (params = {}) => {
  const response = await api.get("/inventory", {
    params,
  });
  return response.data;
};

export const getInventoryItem = async (id) => {
  const response = await api.get(`/inventory/${id}`);
  return response.data;
};

export const createInventoryItem = async (data) => {
  let response;
  if (data instanceof FormData) {
    response = await api.post("/inventory", data, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  } else {
    response = await api.post("/inventory", data);
  }
  return response.data;
};

export const updateInventoryItem = async (id, data) => {
  let response;
  if (data instanceof FormData) {
    response = await api.put(`/inventory/${id}`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  } else {
    response = await api.put(`/inventory/${id}`, data);
  }
  return response.data;
};

export const checkInventoryItem = async (id, data) => {
  const response = await api.patch(`/inventory/${id}/check`, data);
  return response.data;
};

export const decrementInventoryItem = async (id, amount) => {
  const response = await api.patch(`/inventory/${id}/decrement`, { amount });
  return response.data;
};

export const deleteInventoryItem = async (id) => {
  const response = await api.delete(`/inventory/${id}`);
  return response.data;
};

export const uploadInventoryImage = async (file) => {
  const formData = new FormData();
  formData.append("image", file);
  const response = await api.post("/inventory/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};
