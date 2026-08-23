const User = require("../models/User");
const Feedback = require("../models/Feedback");

const getDashboardStats = async () => {
  const [
    totalUsers,
    activeUsers,
    totalFeedbacks,
    recentFeedbacks,
  ] = await Promise.all([
    User.countDocuments(),

    User.countDocuments({
      status: "active",
    }),

    Feedback.countDocuments(),

    Feedback.find()
      .populate(
        "createdBy",
        "username fullName role"
      )
      .sort({
        createdAt: -1,
      })
      .limit(5),
  ]);

  return {
    users: {
      total: totalUsers,
      active: activeUsers,
    },

    feedbacks: {
      total: totalFeedbacks,
    },

    commissions: {
      total: 0,
    },

    reports: {
      total: 0,
    },

    recentFeedbacks,
  };
};

module.exports = {
  getDashboardStats,
};