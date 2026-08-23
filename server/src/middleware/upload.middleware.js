const multer = require("multer");

// Lưu file tạm vào memory
const storage = multer.memoryStorage();

// Chỉ cho phép upload hình ảnh
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // tối đa 5MB
  },
});

module.exports = upload;