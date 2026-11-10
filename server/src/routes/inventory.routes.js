const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");
const {
  getInventory,
  getInventoryItemById,
  createInventoryItem,
  updateInventoryItem,
  checkInventoryItem,
  deleteInventoryItem,
  uploadInventoryImage,
} = require("../controllers/inventory.controller");

const router = express.Router();

router.use(authenticate);

router.get("/", getInventory);
router.get("/:id", getInventoryItemById);
router.post("/", upload.single("imageFile"), createInventoryItem);
router.post("/upload", upload.single("image"), uploadInventoryImage);
router.put("/:id", upload.single("imageFile"), updateInventoryItem);
router.patch("/:id/check", checkInventoryItem);
router.delete("/:id", deleteInventoryItem);

module.exports = router;
