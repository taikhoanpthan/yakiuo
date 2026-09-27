const multer = require("multer");

// Lưu file tạm vào memory
const storage = multer.memoryStorage();

// Chỉ cho phép upload hình ảnh
const imageFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // tối đa 10MB
  },
});

const videoFileFilter = (req, file, cb) => {
  if (["video/mp4", "video/webm"].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Chỉ hỗ trợ video MP4 hoặc WebM"), false);
  }
};

const uploadVideo = multer({
  storage,
  fileFilter: videoFileFilter,
  limits: {
    fileSize: 30 * 1024 * 1024, // tối đa 30MB
  },
});

module.exports = upload;
module.exports.uploadVideo = uploadVideo;
