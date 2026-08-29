const ROLE_PERMISSIONS = {
  admin: [
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
  ],

  employee: [
    "users.read",

    "feedback.read",
    "feedback.create",
    "feedback.update",

    "commission.read",
    "commission.create",
  ],

  premium: [
    "users.read",

    "feedback.read",
    "feedback.create",
    "feedback.update",
    "feedback.delete",

    "commission.read",
    "commission.create",
  ],
};

const hasPermission = (role, permission) => {
  const permissions = ROLE_PERMISSIONS[role] || [];

  return permissions.includes(permission);
};

const getPermissionsByRole = (role) => {
  return ROLE_PERMISSIONS[role] || [];
};

module.exports = {
  ROLE_PERMISSIONS,
  hasPermission,
  getPermissionsByRole,
};
