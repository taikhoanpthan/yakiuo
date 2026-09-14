const CaroMatch = require("../models/CaroMatch");

const countWins = (userId) => CaroMatch.countDocuments({
  $or: [
    { playerX: userId, winner: "X" },
    { playerO: userId, winner: "O" },
  ],
});

const getCaroHistory = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    const [games, total, winCount] = await Promise.all([CaroMatch.find()
      .populate("playerX", "fullName username avatar avatarPosition avatarZoom")
      .populate("playerO", "fullName username avatar avatarPosition avatarZoom")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(), CaroMatch.countDocuments(), countWins(req.user._id)]);

    return res.json({ success: true, data: { games, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }, hint: { winCount, requiredWins: 3, available: winCount >= 3 } } });
  } catch (error) {
    console.error("Get caro history failed:", error);
    return res.status(500).json({ success: false, message: "Không thể tải lịch sử đấu caro" });
  }
};

const deleteCaroMatch = async (req, res) => {
  try {
    if (req.user?.role !== "admin") return res.status(403).json({ success: false, message: "Chỉ admin được xóa lịch sử đấu" });
    const game = await CaroMatch.findByIdAndDelete(req.params.id);
    if (!game) return res.status(404).json({ success: false, message: "Không tìm thấy ván đấu" });
    return res.json({ success: true, message: "Đã xóa lịch sử ván đấu" });
  } catch (error) {
    return res.status(400).json({ success: false, message: "Không thể xóa lịch sử ván đấu" });
  }
};

module.exports = { getCaroHistory, deleteCaroMatch };
