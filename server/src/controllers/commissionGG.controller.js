const cloudinary = require("../config/cloudinary");
const CommissionGGImage = require("../models/CommissionGGImage");

const isMonthKey = (value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value || "");

const getMyCommissionGGImages = async (req, res) => {
  try {
    const monthKey = req.query.month;
    const filter = { createdBy: req.user._id };

    if (monthKey) {
      if (!isMonthKey(monthKey)) {
        return res.status(400).json({ success: false, message: "Tháng không hợp lệ" });
      }
      filter.monthKey = monthKey;
    }

    const images = await CommissionGGImage.find(filter).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: images });
  } catch (error) {
    console.error("Get Commission GG images error:", error);
    return res.status(500).json({ success: false, message: "Không thể tải ảnh Commission GG" });
  }
};

const getCommissionGGImagesByUser = async (req, res) => {
  try {
    if (!["admin", "manager"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Bạn không có quyền xem ảnh Commission GG của nhân viên" });
    }

    const monthKey = req.query.month;
    if (!isMonthKey(monthKey)) {
      return res.status(400).json({ success: false, message: "Tháng không hợp lệ" });
    }

    const images = await CommissionGGImage.find({ createdBy: req.params.userId, monthKey })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, data: images });
  } catch (error) {
    console.error("Get employee Commission GG images error:", error);
    return res.status(500).json({ success: false, message: "Không thể tải ảnh Commission GG của nhân viên" });
  }
};

const uploadCommissionGGImages = async (req, res) => {
  try {
    const monthKey = req.body.month;
    const files = req.files || [];

    if (!isMonthKey(monthKey)) {
      return res.status(400).json({ success: false, message: "Vui lòng chọn tháng hợp lệ" });
    }
    if (!files.length) {
      return res.status(400).json({ success: false, message: "Vui lòng chọn ít nhất một ảnh" });
    }

    const uploaded = await Promise.all(files.map((file) => new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `yakiuo-erp/commission-gg/${req.user._id}/${monthKey}`, resource_type: "image" },
        (error, result) => (error ? reject(error) : resolve(result)),
      );
      stream.end(file.buffer);
    })));

    const images = await CommissionGGImage.insertMany(uploaded.map((item) => ({
      imageUrl: item.secure_url,
      publicId: item.public_id,
      monthKey,
      createdBy: req.user._id,
    })));

    return res.status(201).json({ success: true, message: "Đã tải ảnh Commission GG", data: images });
  } catch (error) {
    console.error("Upload Commission GG images error:", error);
    return res.status(500).json({ success: false, message: "Không thể tải ảnh Commission GG" });
  }
};

const deleteMyCommissionGGImagesByMonth = async (req, res) => {
  try {
    const monthKey = req.query.month;
    if (!isMonthKey(monthKey)) {
      return res.status(400).json({ success: false, message: "Tháng không hợp lệ" });
    }

    const images = await CommissionGGImage.find({ createdBy: req.user._id, monthKey });
    await Promise.all(images.map((image) => cloudinary.uploader.destroy(image.publicId).catch(() => null)));
    await CommissionGGImage.deleteMany({ createdBy: req.user._id, monthKey });

    return res.json({ success: true, message: `Đã xóa ${images.length} ảnh tháng ${monthKey}`, data: { deletedCount: images.length } });
  } catch (error) {
    console.error("Delete Commission GG images error:", error);
    return res.status(500).json({ success: false, message: "Không thể xóa ảnh Commission GG" });
  }
};

module.exports = {
  getMyCommissionGGImages,
  getCommissionGGImagesByUser,
  uploadCommissionGGImages,
  deleteMyCommissionGGImagesByMonth,
};
