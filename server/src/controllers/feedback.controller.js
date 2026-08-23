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
  createFeedback,
  updateFeedback,
  deleteFeedback,
};
