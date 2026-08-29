const express = require("express");
const upload = require("../middleware/upload.middleware");
const { authenticate } = require("../middleware/auth.middleware");
const {
  getMyCommissionGGImages,
  getCommissionGGImagesByUser,
  downloadCommissionGGImages,
  uploadCommissionGGImages,
  deleteMyCommissionGGImagesByMonth,
} = require("../controllers/commissionGG.controller");

const router = express.Router();

router.get("/my", authenticate, getMyCommissionGGImages);
router.get("/my/download", authenticate, downloadCommissionGGImages);
router.get("/user/:userId/download", authenticate, downloadCommissionGGImages);
router.get("/user/:userId", authenticate, getCommissionGGImagesByUser);
router.post("/my", authenticate, upload.array("images", 20), uploadCommissionGGImages);
router.delete("/my/month", authenticate, deleteMyCommissionGGImagesByMonth);

module.exports = router;
