const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const controller = require("../controllers/cfs.controller");

const router = express.Router();
// Audio là nội dung công khai của Audius; thẻ <audio> không thể gửi Bearer
// header nên endpoint chuyển hướng stream phải được đặt trước middleware auth.
router.get("/audius/tracks/:trackId/stream", controller.streamAudiusTrack);
router.use(authenticate);
router.get("/identity", controller.getIdentity);
router.post("/identity", controller.setIdentity);
router.get("/activity", controller.getActivity);
router.post("/activity/read", controller.markActivityRead);
router.post("/activity/:notificationId/read", controller.markActivityItemRead);
router.delete("/activity/:notificationId", controller.deleteActivityItem);
router.get("/audius/tracks", controller.searchAudiusTracks);
router.post("/music/resolve", controller.resolveExternalMusic);
router.get("/stories", controller.getStories);
router.post("/stories", controller.createStory);
router.delete("/stories/:storyId", controller.deleteStory);
router.get("/", controller.getPosts);
router.get("/:id", controller.getPost);
router.post("/", controller.createPost);
router.post("/:id/like", controller.toggleLike);
router.post("/:id/pin", controller.togglePin);
router.post("/:id/replies", controller.reply);
router.post("/:id/replies/:replyId/like", controller.toggleReplyLike);
router.delete("/:id/replies/:replyId", controller.deleteReply);
router.delete("/:id", controller.deletePost);
module.exports = router;
