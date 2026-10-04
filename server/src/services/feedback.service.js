const Feedback = require("../models/Feedback");

const BUSINESS_TIME_ZONE = process.env.FEEDBACK_TIME_ZONE || "Asia/Ho_Chi_Minh";

const getDateKeyInBusinessTimeZone = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Ngày feedback không hợp lệ");
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter(({ type }) => type !== "literal")
      .map(({ type, value: partValue }) => [type, partValue]),
  );

  return `${values.year}-${values.month}-${values.day}`;
};

const getLateEntryDays = (dateTime, now = new Date()) => {
  const feedbackDateKey = getDateKeyInBusinessTimeZone(dateTime);
  const todayKey = getDateKeyInBusinessTimeZone(now);

  if (feedbackDateKey >= todayKey) return 0;

  const [feedbackYear, feedbackMonth, feedbackDay] = feedbackDateKey.split("-").map(Number);
  const [todayYear, todayMonth, todayDay] = todayKey.split("-").map(Number);
  const feedbackUtc = Date.UTC(feedbackYear, feedbackMonth - 1, feedbackDay);
  const todayUtc = Date.UTC(todayYear, todayMonth - 1, todayDay);

  return Math.round((todayUtc - feedbackUtc) / 86_400_000);
};

const flagLateEntryIfNeeded = (feedback, dateTime) => {
  const lateEntryDays = getLateEntryDays(dateTime);

  if (lateEntryDays > 0 && !feedback.isLateEntry) {
    feedback.isLateEntry = true;
    feedback.lateEntryFlaggedAt = new Date();
    feedback.lateEntryDays = lateEntryDays;
  }
};

const getFeedbacks = async ({
  page = 1,
  limit = 20,
  search = "",
  dateFrom,
  dateTo,
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

  if (dateFrom || dateTo) {
    filter.dateTime = {};

    if (dateFrom) {
      const startDate = new Date(dateFrom);
      if (Number.isNaN(startDate.getTime())) {
        throw new Error("Ngày bắt đầu lọc không hợp lệ");
      }
      filter.dateTime.$gte = startDate;
    }

    if (dateTo) {
      const endDate = new Date(dateTo);
      if (Number.isNaN(endDate.getTime())) {
        throw new Error("Ngày kết thúc lọc không hợp lệ");
      }
      filter.dateTime.$lte = endDate;
    }
  }

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
          "username fullName role avatar avatarPosition avatarZoom coverImage coverPosition coverZoom"
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
      "username fullName role avatar avatarPosition avatarZoom coverImage coverPosition coverZoom"
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
  const dateTime = data.dateTime || new Date();
  // Mọi vai trò đều có thể nhập ngày cũ. Nếu ngày được chọn trước hôm nay,
  // bản ghi được gắn cờ kín để admin rà soát.
  getDateKeyInBusinessTimeZone(dateTime);

  const feedback = new Feedback({
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

    dateTime,

    createdBy: userId,
  });

  flagLateEntryIfNeeded(feedback, dateTime);
  await feedback.save();

  // Đọc lại theo projection mặc định để thông tin gắn cờ không trả về người nhập.
  return Feedback.findById(feedback._id);
};

const updateFeedback = async (
  feedbackId,
  data
) => {
  const feedback =
    await Feedback.findById(feedbackId)
      .select("+isLateEntry +lateEntryFlaggedAt +lateEntryDays");

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
    const updatedDate = new Date(data.dateTime);

    if (Number.isNaN(updatedDate.getTime())) {
      throw new Error("Ngày feedback không hợp lệ");
    }

    feedback.dateTime =
      updatedDate;

    flagLateEntryIfNeeded(feedback, updatedDate);
  }

  await feedback.save();

  // Projection mặc định không cho người dùng biết feedback có bị gắn cờ hay không.
  return Feedback.findById(feedback._id);
};

const getLateEntryFeedbacks = async ({ page = 1, limit = 20, search = "" }) => {
  const currentPage = Math.max(Number(page) || 1, 1);
  const currentLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const filter = { isLateEntry: true, lateEntryResolvedAt: null };

  if (search?.trim()) {
    const keyword = search.trim();
    filter.$or = [
      { customerName: { $regex: keyword, $options: "i" } },
      { tableNumber: { $regex: keyword, $options: "i" } },
      { meal: { $regex: keyword, $options: "i" } },
      { content: { $regex: keyword, $options: "i" } },
    ];
  }

  const [feedbacks, total] = await Promise.all([
    Feedback.find(filter)
      .select("+isLateEntry +lateEntryFlaggedAt +lateEntryDays")
      .populate("createdBy", "username fullName role avatar")
      .sort({ lateEntryFlaggedAt: -1 })
      .skip((currentPage - 1) * currentLimit)
      .limit(currentLimit)
      .lean(),
    Feedback.countDocuments(filter),
  ]);

  return {
    feedbacks,
    pagination: {
      page: currentPage,
      limit: currentLimit,
      total,
      totalPages: Math.ceil(total / currentLimit),
    },
  };
};

const resolveLateEntryFeedback = async (feedbackId, adminId) => {
  const feedback = await Feedback.findById(feedbackId)
    .select("+isLateEntry +lateEntryResolvedAt +lateEntryResolvedBy");

  if (!feedback) {
    throw new Error("Feedback not found");
  }

  if (!feedback.isLateEntry) {
    throw new Error("Feedback này không thuộc danh sách cần rà soát");
  }

  if (!feedback.lateEntryResolvedAt) {
    feedback.lateEntryResolvedAt = new Date();
    feedback.lateEntryResolvedBy = adminId;
    await feedback.save();
  }
};

const resolveAllLateEntryFeedbacks = async (adminId) => Feedback.updateMany(
  { isLateEntry: true, lateEntryResolvedAt: null },
  { $set: { lateEntryResolvedAt: new Date(), lateEntryResolvedBy: adminId } }
);

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
  getLateEntryFeedbacks,
  resolveLateEntryFeedback,
  resolveAllLateEntryFeedbacks,
  createFeedback,
  updateFeedback,
  deleteFeedback,
};
