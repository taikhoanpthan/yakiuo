const TeaGameResult = require("../models/TeaGameResult");

const getWeekStart = (date = new Date()) => {
  const hcmOffsetMs = 7 * 60 * 60 * 1000;
  const hcmDate = new Date(date.getTime() + hcmOffsetMs);
  hcmDate.setUTCDate(hcmDate.getUTCDate() - ((hcmDate.getUTCDay() + 6) % 7));
  hcmDate.setUTCHours(0, 0, 0, 0);
  return new Date(hcmDate.getTime() - hcmOffsetMs);
};

const getBadge = (score) => {
  if (score >= 700) return "Vua giữ combo";
  if (score >= 450) return "Barista xịn";
  if (score >= 180) return "Pha chế tập sự";
  return "";
};

const submitTeaGameResult = async (req, res) => {
  try {
    const score = Number(req.body.score);
    const served = Number(req.body.served);
    const mistakes = Number(req.body.mistakes);
    const bestCombo = Number(req.body.bestCombo);
    const numbers = [score, served, mistakes, bestCombo];
    if (!numbers.every(Number.isInteger) || score < 0 || score > 1020 || served < 1 || served > 15 || mistakes < 0 || mistakes > 3 || bestCombo < 0 || bestCombo > 15) {
      return res.status(400).json({ success: false, message: "Kết quả trò chơi không hợp lệ" });
    }

    const result = await TeaGameResult.create({
      user: req.user._id, score, served, mistakes, bestCombo,
      badge: getBadge(score), weekStart: getWeekStart(),
    });
    return res.status(201).json({ success: true, data: { result, badge: result.badge } });
  } catch (error) {
    console.error("Submit tea game result failed:", error);
    return res.status(500).json({ success: false, message: "Không thể lưu kết quả trò chơi" });
  }
};

const getTeaGameLeaderboard = async (req, res) => {
  try {
    const weekStart = getWeekStart();
    const rows = await TeaGameResult.aggregate([
      { $match: { weekStart } },
      { $sort: { score: -1, bestCombo: -1, createdAt: 1 } },
      { $group: { _id: "$user", bestScore: { $first: "$score" }, bestCombo: { $first: "$bestCombo" }, badge: { $first: "$badge" }, runs: { $sum: 1 } } },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
      { $unwind: "$user" },
      { $match: { "user.status": "active" } },
      { $sort: { bestScore: -1, bestCombo: -1, "user.fullName": 1 } },
      { $project: { _id: 0, userId: "$_id", fullName: "$user.fullName", username: "$user.username", avatar: "$user.avatar", bestScore: 1, bestCombo: 1, badge: 1, runs: 1 } },
      { $limit: 100 },
    ]);
    const leaderboard = rows.map((row, index) => ({ ...row, rank: index + 1 }));
    const myEntry = leaderboard.find((row) => String(row.userId) === String(req.user._id)) || null;
    return res.json({ success: true, data: { leaderboard, myEntry, weekStart } });
  } catch (error) {
    console.error("Get tea game leaderboard failed:", error);
    return res.status(500).json({ success: false, message: "Không thể tải bảng xếp hạng" });
  }
};

module.exports = { submitTeaGameResult, getTeaGameLeaderboard };
