const WorkSchedule = require("../models/WorkSchedule");
const cloudinary = require("../config/cloudinary");

// GET lịch làm hiện tại
const getWorkSchedule = async (req, res) => {
  try {
    const schedule = await WorkSchedule.findOne({ category: { $ne: "slide" } })
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

// GET toàn bộ ảnh lịch để quản trị và hiển thị trong slider Dashboard.
const getWorkSchedules = async (req, res) => {
  try {
    const schedules = await WorkSchedule.find({ category: "slide" })
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: schedules,
    });
  } catch (error) {
    console.error("GET WORK SCHEDULES ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể tải danh sách ảnh lịch làm việc",
    });
  }
};

const getPreviousWorkSchedule = async (req, res) => {
  try {
    const schedule = await WorkSchedule.find({ category: { $ne: "slide" } }).sort({ createdAt: -1 }).skip(1).limit(1).lean();
    return res.status(200).json({ success: true, data: schedule[0] || null });
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
    const schedule = await WorkSchedule.create({ imageUrl, publicId, category: "schedule" });

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
    const schedule = await WorkSchedule.findOne({ category: { $ne: "slide" } }).sort({ createdAt: -1 });
    if (!schedule) return res.status(404).json({ success: false, message: "Không có lịch làm việc để xóa" });

    await WorkSchedule.findByIdAndDelete(schedule._id);
    if (schedule.publicId) {
      try { await cloudinary.uploader.destroy(schedule.publicId); } catch (error) { console.error("DELETE WORK SCHEDULE IMAGE ERROR:", error); }
    }

    const currentSchedule = await WorkSchedule.findOne({ category: { $ne: "slide" } }).sort({ createdAt: -1 }).lean();
    req.app.get("io")?.emit("work-schedule:updated", { data: currentSchedule });
    return res.status(200).json({ success: true, message: "Đã xóa lịch làm việc", data: currentSchedule });
  } catch (error) {
    console.error("DELETE WORK SCHEDULE ERROR:", error);
    return res.status(500).json({ success: false, message: "Không thể xóa lịch làm việc" });
  }
};

const deleteWorkScheduleById = async (req, res) => {
  try {
    const schedule = await WorkSchedule.findOneAndDelete({ _id: req.params.id, category: "slide" });
    if (!schedule) {
      return res.status(404).json({ success: false, message: "Không tìm thấy ảnh lịch cần xóa" });
    }

    if (schedule.publicId) {
      try {
        await cloudinary.uploader.destroy(schedule.publicId);
      } catch (error) {
        console.error("DELETE WORK SCHEDULE IMAGE ERROR:", error);
      }
    }

    const currentSchedule = await WorkSchedule.findOne({ category: { $ne: "slide" } }).sort({ createdAt: -1 }).lean();
    req.app.get("io")?.emit("work-schedule:updated", { data: currentSchedule });
    return res.status(200).json({
      success: true,
      message: "Đã xóa ảnh lịch làm việc",
      data: currentSchedule,
    });
  } catch (error) {
    console.error("DELETE WORK SCHEDULE BY ID ERROR:", error);
    return res.status(500).json({ success: false, message: "Không thể xóa ảnh lịch làm việc" });
  }
};

const reorderWorkSchedules = async (req, res) => {
  try {
    const scheduleIds = req.body?.scheduleIds;
    if (!Array.isArray(scheduleIds)) {
      return res.status(400).json({ success: false, message: "Thứ tự ảnh lịch không hợp lệ" });
    }

    const schedules = await WorkSchedule.find({ category: "slide" }).select("_id").lean();
    const existingIds = schedules.map((schedule) => String(schedule._id));
    const requestedIds = scheduleIds.map(String);
    const hasSameSchedules = requestedIds.length === existingIds.length
      && new Set(requestedIds).size === requestedIds.length
      && requestedIds.every((id) => existingIds.includes(id));

    if (!hasSameSchedules) {
      return res.status(400).json({ success: false, message: "Chỉ có thể sắp xếp các ảnh lịch đang có" });
    }

    await Promise.all(requestedIds.map((id, index) => WorkSchedule.findByIdAndUpdate(id, { sortOrder: index })));
    const orderedSchedules = await WorkSchedule.find({ category: "slide" }).sort({ sortOrder: 1, createdAt: -1 }).lean();
    req.app.get("io")?.emit("dashboard-slides:updated", { data: orderedSchedules });
    return res.status(200).json({ success: true, message: "Đã thay đổi thứ tự ảnh lịch", data: orderedSchedules });
  } catch (error) {
    console.error("REORDER WORK SCHEDULES ERROR:", error);
    return res.status(500).json({ success: false, message: "Không thể sắp xếp ảnh lịch" });
  }
};

const createDashboardSlide = async (req, res) => {
  try {
    const { imageUrl, publicId } = req.body;
    if (!imageUrl || !publicId) return res.status(400).json({ success: false, message: "Thiếu imageUrl hoặc publicId" });
    const slide = await WorkSchedule.create({ imageUrl, publicId, category: "slide", sortOrder: -Date.now() });
    req.app.get("io")?.emit("dashboard-slides:updated", { data: slide });
    return res.status(201).json({ success: true, message: "Đã thêm ảnh trình chiếu", data: slide });
  } catch (error) {
    console.error("CREATE DASHBOARD SLIDE ERROR:", error);
    return res.status(500).json({ success: false, message: "Không thể thêm ảnh trình chiếu" });
  }
};

module.exports = {
  getWorkSchedule,
  getWorkSchedules,
  getPreviousWorkSchedule,
  updateWorkSchedule,
  deleteWorkSchedule,
  deleteWorkScheduleById,
  reorderWorkSchedules,
  createDashboardSlide,
};
