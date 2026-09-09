const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const controller = require("../controllers/trash.controller");

const router = express.Router();
router.use(authenticate);
router.get("/my", controller.getMyTrash);
router.post("/:type/:id/restore", controller.restoreTrashItem);
router.delete("/:type/all", controller.clearTrash);

module.exports = router;
