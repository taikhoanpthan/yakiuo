const ChessMatch = require("../models/ChessMatch");

exports.getLeaderboard = async (_req, res) => {
  try {
    const ranking = await ChessMatch.aggregate([
      { $match: { winner: { $in: ["w", "b"] } } },
      { $project: { winnerId: { $cond: [{ $eq: ["$winner", "w"] }, "$playerWhite", "$playerBlack"] } } },
      { $group: { _id: "$winnerId", wins: { $sum: 1 } } },
      { $sort: { wins: -1, _id: 1 } }, { $limit: 20 },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
      { $unwind: "$user" }, { $project: { _id: 0, userId: "$_id", wins: 1, fullName: "$user.fullName", username: "$user.username", avatar: "$user.avatar" } },
    ]);
    res.json({ success: true, data: ranking });
  } catch (error) { res.status(500).json({ success: false, message: "Không thể tải bảng xếp hạng cờ vua" }); }
};
