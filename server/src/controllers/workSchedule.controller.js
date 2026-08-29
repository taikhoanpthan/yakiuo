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

// PUT - thay thế lịch làm hiện tại
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
    const currentSchedule = await WorkSchedule.findOne();

    // Nếu đã có ảnh cũ thì xóa trên Cloudinary
    if (currentSchedule?.publicId) {
      try {
        await cloudinary.uploader.destroy(currentSchedule.publicId);
      } catch (cloudinaryError) {
        console.error(
          "CLOUDINARY DELETE OLD IMAGE ERROR:",
          cloudinaryError
        );
      }
    }

    let schedule;

    if (currentSchedule) {
      // Có rồi -> update
      currentSchedule.imageUrl = imageUrl;
      currentSchedule.publicId = publicId;

      schedule = await currentSchedule.save();
    } else {
      // Chưa có -> tạo lần đầu
      schedule = await WorkSchedule.create({
        imageUrl,
        publicId,
      });
    }

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

module.exports = {
  getWorkSchedule,
  updateWorkSchedule,
};
