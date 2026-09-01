const router = require("express").Router();
const { authenticate } = require("../middleware/auth.middleware");
const controller = require("../controllers/system.controller");
router.get("/status", controller.getStatus);
router.put("/maintenance", authenticate, controller.updateMaintenance);
module.exports = router;
