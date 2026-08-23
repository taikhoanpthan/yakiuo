const cloudinary = require("../config/cloudinary");
const User = require("../models/User");

const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select an image",
      });
    }

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "yakiuo-erp",
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

    user.avatar = result.secure_url;

    await user.save();

    return res.status(201).json({
      success: true,
      message: "Avatar uploaded successfully",
      data: {
        avatar: user.avatar,
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

module.exports = {
  uploadImage,
};