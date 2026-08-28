const express = require("express");

const upload = require("../middleware/upload.middleware");
const { authenticate } = require("../middleware/auth.middleware");
const { uploadImage, uploadChatImage } = require("../controllers/upload.controller");

const router = express.Router();

router.post(
  "/image",
  authenticate,
  upload.single("image"),
  uploadImage,
);

router.post("/chat-image", authenticate, upload.single("image"), uploadChatImage);

module.exports = router;
