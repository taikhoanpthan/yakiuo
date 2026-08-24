import api from "./api";

export const getWorkSchedule = async () => {
  return api.get("/work-schedule");
};

export const updateWorkSchedule = async (data) => {
  return api.put("/work-schedule", data);
};