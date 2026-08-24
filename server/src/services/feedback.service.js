const Feedback = require("../models/Feedback");

const getFeedbacks = async ({
  page = 1,
  limit = 20,
  search = "",
}) => {
  const currentPage = Math.max(
    Number(page) || 1,
    1
  );

  const currentLimit = Math.min(
    Math.max(Number(limit) || 20, 1),
    100
  );

  const skip =
    (currentPage - 1) * currentLimit;

  const filter = {};

  if (search?.trim()) {
    const keyword = search.trim();

    filter.$or = [
      {
        customerName: {
          $regex: keyword,
          $options: "i",
        },
      },
      {
        customerPhone: {
          $regex: keyword,
          $options: "i",
        },
      },
      {
        tableNumber: {
          $regex: keyword,
          $options: "i",
        },
      },
      {
        meal: {
          $regex: keyword,
          $options: "i",
        },
      },
      {
        content: {
          $regex: keyword,
          $options: "i",
        },
      },
    ];
  }

  const [feedbacks, total] =
    await Promise.all([
      Feedback.find(filter)
        .populate(
          "createdBy",
          "username fullName role avatar"
        )
        .sort({
          dateTime: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(currentLimit),

      Feedback.countDocuments(filter),
    ]);

  return {
    feedbacks,

    pagination: {
      page: currentPage,
      limit: currentLimit,
      total,
      totalPages: Math.ceil(
        total / currentLimit
      ),
    },
  };
};

const getFeedbackById = async (
  feedbackId
) => {
  const feedback =
    await Feedback.findById(
      feedbackId
    ).populate(
      "createdBy",
      "username fullName role avatar"
    );

  if (!feedback) {
    throw new Error(
      "Feedback not found"
    );
  }

  return feedback;
};

const createFeedback = async (
  data,
  userId
) => {
  const feedback =
    await Feedback.create({
      customerName:
        data.customerName?.trim() || "",

      customerPhone:
        data.customerPhone?.trim() || "",

      tableNumber:
        data.tableNumber?.trim() || "",

      meal:
        data.meal?.trim() || "",

      tags: Array.isArray(data.tags)
        ? data.tags
        : [],

      content:
        data.content?.trim() || "",

      dateTime:
        data.dateTime || new Date(),

      createdBy: userId,
    });

  return feedback;
};

const updateFeedback = async (
  feedbackId,
  data
) => {
  const feedback =
    await Feedback.findById(
      feedbackId
    );

  if (!feedback) {
    throw new Error(
      "Feedback not found"
    );
  }

  if (
    data.customerName !==
    undefined
  ) {
    feedback.customerName =
      data.customerName?.trim() || "";
  }

  if (
    data.customerPhone !==
    undefined
  ) {
    feedback.customerPhone =
      data.customerPhone?.trim() || "";
  }

  if (
    data.tableNumber !==
    undefined
  ) {
    feedback.tableNumber =
      data.tableNumber?.trim() || "";
  }

  if (
    data.meal !== undefined
  ) {
    feedback.meal =
      data.meal?.trim() || "";
  }

  if (
    data.tags !== undefined
  ) {
    feedback.tags =
      Array.isArray(data.tags)
        ? data.tags
        : [];
  }

  if (
    data.content !== undefined
  ) {
    feedback.content =
      data.content?.trim() || "";
  }

  if (
    data.dateTime !== undefined
  ) {
    feedback.dateTime =
      data.dateTime;
  }

  await feedback.save();

  return feedback;
};

const deleteFeedback = async (
  feedbackId
) => {
  const feedback =
    await Feedback.findById(
      feedbackId
    );

  if (!feedback) {
    throw new Error(
      "Feedback not found"
    );
  }

  await Feedback.findByIdAndDelete(
    feedbackId
  );

  return true;
};

module.exports = {
  getFeedbacks,
  getFeedbackById,
  createFeedback,
  updateFeedback,
  deleteFeedback,
};