import api from "./api";
export const getSystemStatus = () => api.get("/system/status");
export const setMaintenanceMode = (maintenanceMode) => api.put("/system/maintenance", { maintenanceMode });
export const setFeatureVisibility = (feature, enabled) => api.put("/system/features", { feature, enabled });
export const getRolePermissions = () => api.get("/system/permissions");
export const getMyPermissions = () => api.get("/system/permissions/me");
export const setRolePermissions = (rolePermissions) => api.put("/system/permissions", { rolePermissions });
