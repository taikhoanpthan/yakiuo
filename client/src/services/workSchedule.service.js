import api from "./api";

export const getWorkSchedule = async () => {
  return api.get("/work-schedule");
};

export const getWorkSchedules = async () => {
  return api.get("/work-schedule/all");
};

export const getPreviousWorkSchedule = async () => {
  return api.get("/work-schedule/previous");
};

export const updateWorkSchedule = async (data) => {
  return api.put("/work-schedule", data);
};

export const reorderWorkSchedules = async (scheduleIds) => {
  return api.put("/work-schedule/order", { scheduleIds });
};

export const createDashboardSlide = async (data) => {
  return api.post("/work-schedule/slides", data);
};

export const deleteWorkSchedule = async (id) => {
  return api.delete(id ? `/work-schedule/${id}` : "/work-schedule");
};
