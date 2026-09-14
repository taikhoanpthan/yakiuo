const WorkSchedule = require("../models/WorkSchedule");
const cloudinary = require("../config/cloudinary");

// GET lịch làm hiện tại
const getWorkSchedule = async (req, res) => {
  try {
    const schedule = await WorkSchedule.findOne()
      .sort({ updatedAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: schedule,
    });
  } catch (error) {
    console.error("GET WORK SCHEDULE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy lịch làm việc",
    });
  }
};

const getPreviousWorkSchedule = async (req, res) => {
  try {
    const schedule = await WorkSchedule.findOne().sort({ createdAt: -1 }).skip(1).lean();
    return res.status(200).json({ success: true, data: schedule });
  } catch (error) {
    console.error("GET PREVIOUS WORK SCHEDULE ERROR:", error);
    return res.status(500).json({ success: false, message: "Không thể lấy lịch tuần trước" });
  }
};

// PUT - tạo bản lịch mới
const updateWorkSchedule = async (req, res) => {
  try {
    const { imageUrl, publicId } = req.body;

    if (!imageUrl || !publicId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu imageUrl hoặc publicId",
      });
    }

    // Tìm lịch hiện tại
    const schedule = await WorkSchedule.create({ imageUrl, publicId });

    // Lịch làm việc hiển thị ở Dashboard của tất cả nhân viên.
    // Phát sự kiện sau khi lưu thành công để các màn hình đang mở cập nhật ngay.
    req.app.get("io")?.emit("work-schedule:updated", {
      data: schedule,
    });

    return res.status(200).json({
      success: true,
      message: "Cập nhật lịch làm việc thành công",
      data: schedule,
    });
  } catch (error) {
    console.error("UPDATE WORK SCHEDULE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật lịch làm việc",
    });
  }
};

const deleteWorkSchedule = async (req, res) => {
  try {
    const schedule = await WorkSchedule.findOne().sort({ createdAt: -1 });
    if (!schedule) return res.status(404).json({ success: false, message: "Không có lịch làm việc để xóa" });

    await WorkSchedule.findByIdAndDelete(schedule._id);
    if (schedule.publicId) {
      try { await cloudinary.uploader.destroy(schedule.publicId); } catch (error) { console.error("DELETE WORK SCHEDULE IMAGE ERROR:", error); }
    }

    const currentSchedule = await WorkSchedule.findOne().sort({ createdAt: -1 }).lean();
    req.app.get("io")?.emit("work-schedule:updated", { data: currentSchedule });
    return res.status(200).json({ success: true, message: "Đã xóa lịch làm việc", data: currentSchedule });
  } catch (error) {
    console.error("DELETE WORK SCHEDULE ERROR:", error);
    return res.status(500).json({ success: false, message: "Không thể xóa lịch làm việc" });
  }
};

module.exports = {
  getWorkSchedule,
  getPreviousWorkSchedule,
  updateWorkSchedule,
  deleteWorkSchedule,
};
