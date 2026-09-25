import api from "./api";
export const getSystemStatus = () => api.get("/system/status");
export const setMaintenanceMode = (maintenanceMode) => api.put("/system/maintenance", { maintenanceMode });
export const setFeatureVisibility = (feature, enabled) => api.put("/system/features", { feature, enabled });
