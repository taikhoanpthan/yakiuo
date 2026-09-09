const cloudinary = require("../config/cloudinary");
const Commission = require("../models/Commission");
const CommissionGGImage = require("../models/CommissionGGImage");

const ownFilter = (req) => ({ createdBy: req.user._id, trashedAt: { $ne: null } });

exports.getMyTrash = async (req, res) => {
  try {
    const [ggImages, commissions] = await Promise.all([
      CommissionGGImage.find(ownFilter(req)).sort({ trashedAt: -1 }).lean(),
      Commission.find(ownFilter(req)).sort({ trashedAt: -1 }).lean(),
    ]);
    return res.json({ success: true, data: { ggImages, commissions } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Không thể tải thùng rác" });
  }
};

exports.restoreTrashItem = async (req, res) => {
  try {
    const Model = req.params.type === "gg" ? CommissionGGImage : req.params.type === "commission" ? Commission : null;
    if (!Model) return res.status(400).json({ success: false, message: "Loại dữ liệu không hợp lệ" });
    const item = await Model.findOneAndUpdate({ _id: req.params.id, ...ownFilter(req) }, { $set: { trashedAt: null } }, { new: true });
    if (!item) return res.status(404).json({ success: false, message: "Không tìm thấy mục trong thùng rác" });
    return res.json({ success: true, data: item });
  } catch (error) {
    return res.status(400).json({ success: false, message: "Không thể khôi phục mục này" });
  }
};

exports.clearTrash = async (req, res) => {
  try {
    const type = req.params.type;
    if (type === "gg") {
      const images = await CommissionGGImage.find(ownFilter(req));
      const deletedIds = (await Promise.all(images.map(async (image) => {
        try {
          const result = await cloudinary.uploader.destroy(image.publicId);
          return ["ok", "not found"].includes(result.result) ? image._id : null;
        } catch { return null; }
      }))).filter(Boolean);
      await CommissionGGImage.deleteMany({ _id: { $in: deletedIds } });
      return res.json({ success: true, message: `Đã xóa vĩnh viễn ${deletedIds.length} ảnh GG` });
    }
    if (type === "commission") {
      const result = await Commission.deleteMany(ownFilter(req));
      return res.json({ success: true, message: `Đã xóa vĩnh viễn ${result.deletedCount} commission` });
    }
    return res.status(400).json({ success: false, message: "Loại dữ liệu không hợp lệ" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Không thể làm trống thùng rác" });
  }
};
