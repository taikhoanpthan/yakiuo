const express = require("express");

const upload = require("../middleware/upload.middleware");
const { authenticate } = require("../middleware/auth.middleware");
const { uploadImage, uploadCfsImage, uploadCfsVideo } = require("../controllers/upload.controller");

const router = express.Router();

router.post(
  "/image",
  authenticate,
  upload.single("image"),
  uploadImage,
);

router.post("/cfs-image", authenticate, upload.single("image"), uploadCfsImage);
router.post("/cfs-video", authenticate, upload.uploadVideo.single("video"), uploadCfsVideo);

module.exports = router;
