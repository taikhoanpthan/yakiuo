const cloudinary = require("../config/cloudinary");
const User = require("../models/User");
const { recordActivity } = require("../services/userActivity.service");

const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select an image",
      });
    }

    const imageType = req.body?.type === "cover" ? "cover" : "avatar";

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `yakiuo-erp/${imageType}s`,
          resource_type: "image",
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        },
      );

      uploadStream.end(req.file.buffer);
    });

    const user = await User.findById(req.user._id);

    if (!user) {
      // Upload lên Cloudinary nhưng không tìm thấy user
      // thì xóa ảnh vừa upload để tránh ảnh rác
      await cloudinary.uploader.destroy(result.public_id);

      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const oldImageUrl = imageType === "cover" ? user.coverImage : user.avatar;
    if (imageType === "cover") {
      user.coverImage = result.secure_url;
    } else {
      user.avatar = result.secure_url;
    }

    await user.save();
    await recordActivity({
      user: user._id,
      type: imageType === "cover" ? "cover_changed" : "avatar_changed",
      imageUrl: result.secure_url,
      oldImageUrl,
      newImageUrl: result.secure_url,
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || "",
    });

    return res.status(201).json({
      success: true,
      message: `${imageType === "cover" ? "Cover image" : "Avatar"} uploaded successfully`,
      data: {
        avatar: user.avatar,
        coverImage: user.coverImage,
      },
    });
  } catch (error) {
    console.error("Upload avatar failed:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to upload avatar",
    });
  }
};

const uploadChatImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Vui lòng chọn ảnh hoặc GIF" });
    }

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "yakiuo-erp/chat", resource_type: "image" },
        (error, uploadResult) => (error ? reject(error) : resolve(uploadResult)),
      );
      uploadStream.end(req.file.buffer);
    });

    return res.status(201).json({ success: true, data: { url: result.secure_url, format: result.format } });
  } catch (error) {
    console.error("Upload chat image failed:", error);
    return res.status(500).json({ success: false, message: "Không thể tải ảnh lên" });
  }
};

module.exports = {
  uploadImage,
  uploadChatImage,
};
