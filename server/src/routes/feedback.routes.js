const express = require("express");

const feedbackController = require("../controllers/feedback.controller");

const {
  authenticate,
} = require("../middleware/auth.middleware");

const {
  requirePermission,
} = require("../middleware/permission.middleware");

const router = express.Router();

router.use(authenticate);

router.get(
  "/",
  requirePermission("feedback.read"),
  feedbackController.getFeedbacks
);

router.get(
  "/:id",
  requirePermission("feedback.read"),
  feedbackController.getFeedbackById
);

router.post(
  "/",
  requirePermission("feedback.create"),
  feedbackController.createFeedback
);

router.patch(
  "/:id",
  requirePermission("feedback.update"),
  feedbackController.updateFeedback
);

router.delete(
  "/:id",
  requirePermission("feedback.delete"),
  feedbackController.deleteFeedback
);

module.exports = router;