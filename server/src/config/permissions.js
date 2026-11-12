const ROLE_PERMISSIONS = {
  admin: [
    "audit.read",
    "users.read",
    "users.create",
    "users.update",
    "users.delete",

    "workSchedule.update",

    "feedback.read",
    "feedback.create",
    "feedback.update",
    "feedback.delete",

    "commission.read",
    "commission.create",
    "commission.update",
    "commission.delete",

    "reports.read",

    "notifications.read",
    "notifications.create",
    "notifications.update",
    "notifications.delete",

    "inventory.read",
    "inventory.create",
    "inventory.update",
    "inventory.delete",
  ],

  manager: [
    "users.read",
    "users.update",

    "workSchedule.update",

    "notifications.read",
    "notifications.create",
    "notifications.update",
    "notifications.delete",

    "feedback.read",
    "feedback.create",
    "feedback.update",
    "feedback.delete",

    "commission.read",
    "commission.create",
    "commission.update",
    "commission.delete",

    "reports.read",

    "inventory.read",
    "inventory.update",
  ],

  employee: [
    "users.read",

    "feedback.read",
    "feedback.create",
    "feedback.update",

    "commission.read",
    "commission.create",

    "inventory.read",
    "inventory.update",
  ],

  premium: [
    "users.read",

    "feedback.read",
    "feedback.create",
    "feedback.update",
    "feedback.delete",

    "commission.read",
    "commission.create",

    "inventory.read",
    "inventory.update",
  ],
};

const ROLE_LABELS = {
  admin: "Admin",
  manager: "Manager",
  employee: "Employee",
  premium: "Premium",
};

const PERMISSION_CATALOG = [
  ["audit.read", "Lịch sử hoạt động", "Xem"],
  ["users.read", "Nhân viên", "Xem"], ["users.create", "Nhân viên", "Thêm"], ["users.update", "Nhân viên", "Chỉnh sửa"], ["users.delete", "Nhân viên", "Xóa"],
  ["workSchedule.update", "Lịch & ảnh trình chiếu", "Cập nhật"],
  ["feedback.read", "Feedback", "Xem"], ["feedback.create", "Feedback", "Tạo"], ["feedback.update", "Feedback", "Chỉnh sửa"], ["feedback.delete", "Feedback", "Xóa"],
  ["commission.read", "Commission", "Xem"], ["commission.create", "Commission", "Tạo"], ["commission.update", "Commission", "Chỉnh sửa"], ["commission.delete", "Commission", "Xóa"],
  ["reports.read", "Báo cáo", "Xem"],
  ["notifications.read", "Thông báo", "Xem"], ["notifications.create", "Thông báo", "Tạo"], ["notifications.update", "Thông báo", "Chỉnh sửa"], ["notifications.delete", "Thông báo", "Xóa"],
  ["inventory.read", "Kiểm kê", "Xem"], ["inventory.create", "Kiểm kê", "Thêm"], ["inventory.update", "Kiểm kê", "Chỉnh sửa / kiểm kê"], ["inventory.delete", "Kiểm kê", "Xóa"],
].map(([key, group, action]) => ({ key, group, action }));

const roles = Object.keys(ROLE_PERMISSIONS);
const permissionKeys = new Set(PERMISSION_CATALOG.map(({ key }) => key));
let cachedRolePermissions = null;
let cacheExpiresAt = 0;

const cloneDefaults = () => Object.fromEntries(roles.map((role) => [role, [...ROLE_PERMISSIONS[role]] ]));
const normalizeRolePermissions = (value) => {
  const normalized = cloneDefaults();
  if (!value || typeof value !== "object") return normalized;
  roles.forEach((role) => {
    if (Array.isArray(value[role])) normalized[role] = [...new Set(value[role].filter((permission) => permissionKeys.has(permission)))];
  });
  return normalized;
};
const clearPermissionCache = () => { cachedRolePermissions = null; cacheExpiresAt = 0; };
const getRolePermissions = async () => {
  if (cachedRolePermissions && Date.now() < cacheExpiresAt) return cachedRolePermissions;
  const SystemSetting = require("../models/SystemSetting");
  const settings = await SystemSetting.findOne({ key: "system" }).select("rolePermissions").lean();
  cachedRolePermissions = normalizeRolePermissions(settings?.rolePermissions);
  cacheExpiresAt = Date.now() + 5000;
  return cachedRolePermissions;
};
const hasPermission = async (role, permission) => (await getRolePermissions())[role]?.includes(permission) || false;

const getPermissionsByRole = (role) => {
  return ROLE_PERMISSIONS[role] || [];
};

module.exports = {
  ROLE_PERMISSIONS,
  ROLE_LABELS,
  PERMISSION_CATALOG,
  roles,
  permissionKeys,
  normalizeRolePermissions,
  getRolePermissions,
  clearPermissionCache,
  hasPermission,
  getPermissionsByRole,
};
