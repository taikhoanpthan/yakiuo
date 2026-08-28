const FeedbackTag = require("../models/FeedbackTag");

const canUseTags = (role) => ["admin", "premium"].includes(role);

const getFeedbackTags = async (req, res) => {
  try {
    if (!canUseTags(req.user.role)) {
      return res.status(403).json({ success: false, message: "Chỉ tài khoản Premium mới dùng được nhãn có sẵn" });
    }

    const tags = await FeedbackTag.find().sort({ label: 1 }).lean();
    return res.json({ success: true, data: tags });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Không thể tải nhãn feedback" });
  }
};

const createFeedbackTag = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Chỉ admin được tạo nhãn feedback" });
    }

    const label = req.body.label?.trim();
    if (!label) return res.status(400).json({ success: false, message: "Vui lòng nhập tên nhãn" });

    const tag = await FeedbackTag.create({ label, createdBy: req.user._id });
    return res.status(201).json({ success: true, data: tag });
  } catch (error) {
    const message = error?.code === 11000 ? "Nhãn này đã tồn tại" : "Không thể tạo nhãn feedback";
    return res.status(400).json({ success: false, message });
  }
};

const deleteFeedbackTag = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Chỉ admin được xóa nhãn feedback" });
    }

    const tag = await FeedbackTag.findByIdAndDelete(req.params.id);
    if (!tag) return res.status(404).json({ success: false, message: "Không tìm thấy nhãn feedback" });
    return res.json({ success: true, message: "Đã xóa nhãn feedback" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Không thể xóa nhãn feedback" });
  }
};

module.exports = { getFeedbackTags, createFeedbackTag, deleteFeedbackTag };
