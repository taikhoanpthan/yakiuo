const SystemSetting = require("../models/SystemSetting");
const User = require("../models/User");
const getSettings = () => SystemSetting.findOneAndUpdate({ key: "system" }, { $setOnInsert: { key: "system" } }, { new: true, upsert: true });
exports.getStatus = async (_req, res) => { const settings = await getSettings(); res.json({ success: true, data: { maintenanceMode: settings.maintenanceMode } }); };
exports.updateMaintenance = async (req, res) => {
  if (req.user?.role !== "admin") return res.status(403).json({ success: false, message: "Chỉ admin được thay đổi chế độ bảo trì" });
  const maintenanceMode = Boolean(req.body.maintenanceMode);
  const settings = await SystemSetting.findOneAndUpdate({ key: "system" }, { $set: { maintenanceMode } }, { new: true, upsert: true });
  if (maintenanceMode) {
    const users = await User.find({ role: { $ne: "admin" } }).select("_id").lean();
    const io = req.app.get("io");
    users.forEach((user) => io?.to(`user:${user._id}`).emit("maintenance:enabled"));
  }
  req.app.get("io")?.emit("maintenance:changed", { maintenanceMode });
  res.json({ success: true, data: { maintenanceMode: settings.maintenanceMode } });
};
