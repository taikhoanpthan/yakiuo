const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const { getFeedbackTags, createFeedbackTag, deleteFeedbackTag } = require("../controllers/feedbackTag.controller");

const router = express.Router();
router.get("/", authenticate, getFeedbackTags);
router.post("/", authenticate, createFeedbackTag);
router.delete("/:id", authenticate, deleteFeedbackTag);

module.exports = router;
