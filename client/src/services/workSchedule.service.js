import api from "./api";

export const getWorkSchedule = async () => {
  return api.get("/work-schedule");
};

export const getPreviousWorkSchedule = async () => {
  return api.get("/work-schedule/previous");
};

export const updateWorkSchedule = async (data) => {
  return api.put("/work-schedule", data);
};

export const deleteWorkSchedule = async () => {
  return api.delete("/work-schedule");
};
