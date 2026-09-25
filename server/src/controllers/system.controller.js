const SystemSetting = require("../models/SystemSetting");
const User = require("../models/User");
const DEFAULT_FEATURES = { cfs: true, caro: true, chat: true };
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
