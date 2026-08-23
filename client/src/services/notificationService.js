import api from "./api";

// Lấy danh sách thông báo
export const getNotifications = async () => {
  return api.get("/notifications");
};

// Lấy thông báo theo ID
export const getNotificationById = async (id) => {
  return api.get(`/notifications/${id}`);
};

// Admin tạo thông báo
export const createNotification = async (data) => {
  return api.post("/notifications", data);
};

// Admin sửa thông báo
export const updateNotification = async (id, data) => {
  return api.put(`/notifications/${id}`, data);
};

// Admin xóa thông báo
export const deleteNotification = async (id) => {
  return api.delete(`/notifications/${id}`);
};