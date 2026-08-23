const express = require("express");

const upload = require("../middleware/upload.middleware");
const { authenticate } = require("../middleware/auth.middleware");
const { uploadImage } = require("../controllers/upload.controller");

const router = express.Router();

router.post(
  "/image",
  authenticate,
  upload.single("image"),
  uploadImage,
);

module.exports = router;