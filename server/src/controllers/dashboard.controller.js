const dashboardService = require("../services/dashboard.service");

const getDashboardStats = async (req, res) => {
  try {
    const data =
      await dashboardService.getDashboardStats();

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "Get dashboard stats failed:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to get dashboard statistics",
    });
  }
};

module.exports = {
  getDashboardStats,
};