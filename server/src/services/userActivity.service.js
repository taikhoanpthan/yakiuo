const UserActivity = require("../models/UserActivity");

const recordActivity = async ({ user, type, imageUrl = "", ipAddress = "", userAgent = "" }) => {
  try {
    await UserActivity.create({ user, type, imageUrl, ipAddress, userAgent });
  } catch (error) {
    // Không để việc ghi audit làm hỏng thao tác chính của người dùng.
    console.error("Record user activity failed:", error);
  }
};

const getActivities = async ({ page = 1, limit = 30, userId, type }) => {
  const currentPage = Math.max(Number(page) || 1, 1);
  const currentLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);
  const filter = {};
  if (userId) filter.user = userId;
  if (["login", "password_changed", "avatar_changed", "cover_changed"].includes(type)) filter.type = type;

  const [activities, total] = await Promise.all([
    UserActivity.find(filter)
      .populate("user", "fullName username avatar avatarPosition avatarZoom coverImage role")
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * currentLimit)
      .limit(currentLimit)
      .lean(),
    UserActivity.countDocuments(filter),
  ]);

  return { activities, pagination: { page: currentPage, limit: currentLimit, total, totalPages: Math.ceil(total / currentLimit) } };
};

const deleteActivity = async (activityId) => {
  const activity = await UserActivity.findByIdAndDelete(activityId);
  if (!activity) throw new Error("Không tìm thấy lịch sử cần xóa");
  return activity;
};

const deleteAllActivities = async () => {
  const result = await UserActivity.deleteMany({});
  return result.deletedCount;
};

module.exports = { recordActivity, getActivities, deleteActivity, deleteAllActivities };
