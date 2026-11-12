const SystemSetting = require("../models/SystemSetting");
const User = require("../models/User");
const { PERMISSION_CATALOG, ROLE_LABELS, roles, permissionKeys, normalizeRolePermissions, getRolePermissions, clearPermissionCache } = require("../config/permissions");
const DEFAULT_FEATURES = { cfs: true, caro: true, chess: true };
const getSettings = () => SystemSetting.findOne({ key: "system" }).select("maintenanceMode features").lean();
const getStatusData = (settings) => ({
  maintenanceMode: Boolean(settings?.maintenanceMode),
  features: { ...DEFAULT_FEATURES, ...(settings?.features || {}) },
});

exports.getStatus = async (_req, res) => {
  const settings = await getSettings();
  res.json({ success: true, data: getStatusData(settings) });
};
exports.updateMaintenance = async (req, res) => {
  if (req.user?.role !== "admin") return res.status(403).json({ success: false, message: "Chỉ admin được thay đổi chế độ bảo trì" });
  const maintenanceMode = Boolean(req.body.maintenanceMode);
  const settings = await SystemSetting.findOneAndUpdate({ key: "system" }, { $set: { maintenanceMode } }, { returnDocument: "after", upsert: true });
  if (maintenanceMode) {
    const users = await User.find({ role: { $ne: "admin" } }).select("_id").lean();
    const io = req.app.get("io");
    users.forEach((user) => io?.to(`user:${user._id}`).emit("maintenance:enabled"));
  }
  req.app.get("io")?.emit("maintenance:changed", { maintenanceMode });
  res.json({ success: true, data: getStatusData(settings) });
};

exports.updateFeatureVisibility = async (req, res) => {
  if (req.user?.role !== "admin") return res.status(403).json({ success: false, message: "Chỉ admin được thay đổi trạng thái tính năng" });

  const { feature, enabled } = req.body;
  if (!Object.hasOwn(DEFAULT_FEATURES, feature) || typeof enabled !== "boolean") {
    return res.status(400).json({ success: false, message: "Thiết lập tính năng không hợp lệ" });
  }

  const settings = await SystemSetting.findOneAndUpdate(
    { key: "system" },
    { $set: { [`features.${feature}`]: enabled } },
    { returnDocument: "after", upsert: true },
  );
  const data = getStatusData(settings);
  req.app.get("io")?.emit("system:features-changed", { features: data.features });
  return res.json({ success: true, data });
};

exports.getRolePermissions = async (req, res) => {
  if (req.user?.role !== "admin") return res.status(403).json({ success: false, message: "Chỉ admin được xem phân quyền" });
  return res.json({ success: true, data: { roles: roles.map((key) => ({ key, label: ROLE_LABELS[key] })), permissions: PERMISSION_CATALOG, rolePermissions: await getRolePermissions() } });
};

exports.getMyPermissions = async (req, res) => {
  const rolePermissions = await getRolePermissions();
  return res.json({ success: true, data: { permissions: rolePermissions[req.user?.role] || [] } });
};

exports.updateRolePermissions = async (req, res) => {
  if (req.user?.role !== "admin") return res.status(403).json({ success: false, message: "Chỉ admin được thay đổi phân quyền" });
  const { rolePermissions } = req.body || {};
  if (!rolePermissions || typeof rolePermissions !== "object") return res.status(400).json({ success: false, message: "Dữ liệu phân quyền không hợp lệ" });
  const invalid = Object.entries(rolePermissions).some(([role, permissions]) => !roles.includes(role) || !Array.isArray(permissions) || permissions.some((permission) => !permissionKeys.has(permission)));
  if (invalid) return res.status(400).json({ success: false, message: "Có quyền hoặc vai trò không hợp lệ" });
  const data = normalizeRolePermissions(rolePermissions);
  await SystemSetting.findOneAndUpdate({ key: "system" }, { $set: { rolePermissions: data } }, { upsert: true, returnDocument: "after" });
  clearPermissionCache();
  req.app.get("io")?.emit("system:permissions-changed");
  return res.json({ success: true, data: { rolePermissions: await getRolePermissions() } });
};
