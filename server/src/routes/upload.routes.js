const express = require("express");

const upload = require("../middleware/upload.middleware");
const { authenticate } = require("../middleware/auth.middleware");
const { uploadImage, uploadChatImage, uploadCfsVideo } = require("../controllers/upload.controller");

const router = express.Router();

router.post(
  "/image",
  authenticate,
  upload.single("image"),
  uploadImage,
);

router.post("/chat-image", authenticate, upload.single("image"), uploadChatImage);
router.post("/cfs-video", authenticate, upload.uploadVideo.single("video"), uploadCfsVideo);

module.exports = router;
