const feedbackService = require("../services/feedback.service");

const getFeedbacks = async (req, res) => {
  try {
    const result = await feedbackService.getFeedbacks(req.query);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get feedbacks failed:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get feedbacks",
    });
  }
};

const getFeedbackById = async (req, res) => {
  try {
    const feedback = await feedbackService.getFeedbackById(req.params.id);

    return res.status(200).json({
      success: true,
      data: {
        feedback,
      },
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

const getLateEntryFeedbacks = async (req, res) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Chỉ admin được xem feedback bị gắn cờ",
      });
    }

    const result = await feedbackService.getLateEntryFeedbacks(req.query);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get late-entry feedbacks failed:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể tải danh sách feedback bị gắn cờ",
    });
  }
};

const createFeedback = async (req, res) => {
  try {
    const {
      customerName,
      customerPhone,
      tableNumber,
      meal,
      tags,
      content,
      dateTime,
    } = req.body;

    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication information is missing",
      });
    }

    const result = await feedbackService.createFeedback(
      {
        customerName,
        customerPhone,
        tableNumber,
        meal,
        tags,
        content,
        dateTime,
      },
      userId,
    );

    return res.status(201).json({
      success: true,
      message: "Feedback created successfully",
      data: {
        feedback: result,
      },
    });
  } catch (error) {
    console.error("Create feedback failed:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const updateFeedback = async (req, res) => {
  try {
    const feedback = await feedbackService.updateFeedback(
      req.params.id,
      req.body,
    );

    return res.status(200).json({
      success: true,
      message: "Feedback updated successfully",
      data: {
        feedback,
      },
    });
  } catch (error) {
    console.error("Update feedback failed:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteFeedback = async (req, res) => {
  try {
    await feedbackService.deleteFeedback(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Feedback deleted successfully",
    });
  } catch (error) {
    console.error("Delete feedback failed:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getFeedbacks,
  getFeedbackById,
  getLateEntryFeedbacks,
  createFeedback,
  updateFeedback,
  deleteFeedback,
};
