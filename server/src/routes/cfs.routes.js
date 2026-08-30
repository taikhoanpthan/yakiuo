const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const controller = require("../controllers/cfs.controller");

const router = express.Router();
router.use(authenticate);
router.get("/identity", controller.getIdentity);
router.post("/identity", controller.setIdentity);
router.get("/", controller.getPosts);
router.post("/", controller.createPost);
router.post("/:id/like", controller.toggleLike);
router.post("/:id/replies", controller.reply);
router.post("/:id/replies/:replyId/like", controller.toggleReplyLike);
router.delete("/:id/replies/:replyId", controller.deleteReply);
router.delete("/:id", controller.deletePost);
module.exports = router;
