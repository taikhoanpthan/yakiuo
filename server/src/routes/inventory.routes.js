const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const { requirePermission } = require("../middleware/permission.middleware");
const upload = require("../middleware/upload.middleware");
const {
  getInventory,
  getInventoryItemById,
  createInventoryItem,
  updateInventoryItem,
  checkInventoryItem,
  decrementInventoryItem,
  deleteInventoryItem,
  uploadInventoryImage,
} = require("../controllers/inventory.controller");

const router = express.Router();

router.use(authenticate);

router.get("/", requirePermission("inventory.read"), getInventory);
router.get("/:id", requirePermission("inventory.read"), getInventoryItemById);
router.post("/", requirePermission("inventory.create"), upload.single("imageFile"), createInventoryItem);
router.post("/upload", requirePermission("inventory.create"), upload.single("image"), uploadInventoryImage);
router.put("/:id", requirePermission("inventory.update"), upload.single("imageFile"), updateInventoryItem);
router.patch("/:id/check", requirePermission("inventory.update"), checkInventoryItem);
router.patch("/:id/decrement", requirePermission("inventory.update"), decrementInventoryItem);
router.delete("/:id", requirePermission("inventory.delete"), deleteInventoryItem);

module.exports = router;
